/**
 * 9M Schedule PWA — State Store
 * Simple reactive state management
 */
const Store = {
  _state: {
    user: null,               // { name, designation, loginTime }
    currentPage: 'dashboard',
    previousPage: null,
    scheduleData: {
      electrical: null,       // Loaded from JSON
      mechanical: null        // Loaded from JSON
    },
    staffData: null,          // Loaded from JSON
    coachData: null,          // Loaded from JSON
    completions: {},          // { [activityId_coachId]: completionRecord }
    theme: 'dark',
    preferredView: 'card',    // card | grid | list
    isOnline: navigator.onLine,
    isLoading: false,
    pendingSync: [],          // Queue for offline changes
    activityLog: [],          // Local activity log
    customValueSpecs: {},      // { [activityId]: { title, fields: [...] } }
    customValueReqOverrides: {} // { [activityId]: boolean }
  },

  /**
   * Get entire state or a specific key
   */
  get(key) {
    if (key) {
      return key.split('.').reduce((obj, k) => obj?.[k], this._state);
    }
    return this._state;
  },

  /**
   * Set state value (supports dot notation)
   */
  set(key, value) {
    const keys = key.split('.');
    let obj = this._state;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    
    // Emit change event
    Utils.emit('state:change', { key, value });
    Utils.emit(`state:${key}`, value);
  },

  /**
   * Initialize state from localStorage
   */
  init() {
    // Load persisted state
    const savedUser = Utils.getLocal('9m_user');
    if (savedUser) this._state.user = savedUser;

    const savedTheme = Utils.getLocal('9m_theme', 'dark');
    this._state.theme = savedTheme;
    document.documentElement.setAttribute('data-theme', savedTheme);

    const savedView = Utils.getLocal('9m_preferred_view', 'card');
    this._state.preferredView = savedView;

    const savedLog = Utils.getLocal('9m_activity_log', []);
    this._state.activityLog = savedLog;

    const savedCompletions = Utils.getLocal('9m_completions', {});
    this._state.completions = savedCompletions;

    const savedPending = Utils.getLocal('9m_pending_sync', []);
    this._state.pendingSync = savedPending;

    const savedSpecs = Utils.getLocal('9m_custom_value_specs', {});
    this._state.customValueSpecs = savedSpecs;

    const savedOverrides = Utils.getLocal('9m_custom_value_req_overrides', {});
    this._state.customValueReqOverrides = savedOverrides;

    // Listen for online/offline
    window.addEventListener('online', () => {
      this.set('isOnline', true);
      Utils.toast('Back online! Syncing...', 'success');
      this.syncPending();
    });

    window.addEventListener('offline', () => {
      this.set('isOnline', false);
      Utils.toast('You are offline. Changes will sync when connected.', 'warning');
    });

    // Initialize Supabase Service
    if (window.SupabaseService) {
      SupabaseService.init();
    }
  },

  /**
   * Save user session
   */
  setUser(name, designation) {
    const user = { name, designation, loginTime: Utils.now() };
    this.set('user', user);
    Utils.setLocal('9m_user', user);
    this.log('login', `${name} (${designation}) logged in`);
  },

  /**
   * Clear user session
   */
  clearUser() {
    this.set('user', null);
    Utils.removeLocal('9m_user');
  },

  /**
   * Set theme
   */
  setTheme(theme) {
    // Handle 'system' theme
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    this.set('theme', theme);
    Utils.setLocal('9m_theme', theme);

    // Update theme-color meta
    const colors = { dark: '#0a0e17', light: '#f8fafc' };
    const effectiveTheme = theme === 'system' 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors[effectiveTheme] || colors.dark);
  },

  /**
   * Set preferred view
   */
  setPreferredView(view) {
    this.set('preferredView', view);
    Utils.setLocal('9m_preferred_view', view);
  },

  /**
   * Save a completion record
   */
  saveCompletion(activityId, coachId, data) {
    const key = `${activityId}_${coachId}`;
    const record = {
      ...data,
      updatedAt: Utils.now()
    };
    this._state.completions[key] = record;
    Utils.setLocal('9m_completions', this._state.completions);
    
    // Log the action
    const logEntry = this.log('save_completion', `Activity ${activityId}, Coach ${coachId}: ${data.completed ? 'Completed' : 'Updated'}`);

    // Sync online or queue offline
    if (this._state.isOnline && window.SupabaseService && SupabaseService.isConfigured()) {
      SupabaseService.upsertCompletion(activityId, coachId, record)
        .then(() => SupabaseService.insertLog(logEntry))
        .catch(err => {
          console.warn('Failed to upsert completion to Supabase, queuing:', err);
          this._queuePendingSync({
            type: 'completion',
            key,
            activityId,
            coachId,
            data: record,
            timestamp: Utils.now()
          });
        });
    } else {
      this._queuePendingSync({
        type: 'completion',
        key,
        activityId,
        coachId,
        data: record,
        timestamp: Utils.now()
      });
    }

    Utils.emit('completion:saved', { activityId, coachId, data });
  },

  /**
   * Get completion record
   */
  getCompletion(activityId, coachId) {
    return this._state.completions[`${activityId}_${coachId}`] || null;
  },

  /**
   * Get all completions for an activity (across coaches)
   */
  getActivityCompletions(activityId) {
    const results = {};
    Object.entries(this._state.completions).forEach(([key, val]) => {
      if (key.startsWith(`${activityId}_`)) {
        const coachId = key.split('_')[1];
        results[coachId] = val;
      }
    });
    return results;
  },

  /**
   * Delete a completion record (uncheck coach)
   */
  deleteCompletion(activityId, coachId) {
    const key = `${activityId}_${coachId}`;
    if (this._state.completions[key]) {
      delete this._state.completions[key];
      Utils.setLocal('9m_completions', this._state.completions);
    }
    
    // Log the action
    const logEntry = this.log('delete_completion', `Activity ${activityId}, Coach ${coachId}: Removed completion`);

    // Sync online or queue offline
    if (this._state.isOnline && window.SupabaseService && SupabaseService.isConfigured()) {
      SupabaseService.deleteCompletion(activityId, coachId)
        .then(() => SupabaseService.insertLog(logEntry))
        .catch(err => {
          console.warn('Failed to delete completion from Supabase, queuing:', err);
          this._queuePendingSync({
            type: 'delete_completion',
            key,
            activityId,
            coachId,
            timestamp: Utils.now()
          });
        });
    } else {
      this._queuePendingSync({
        type: 'delete_completion',
        key,
        activityId,
        coachId,
        timestamp: Utils.now()
      });
    }

    Utils.emit('completion:deleted', { activityId, coachId });
  },

  /**
   * Calculate completion stats for an equipment
   */
  getEquipmentStats(equipment) {
    if (!equipment || !equipment.sub_sections) return { total: 0, completed: 0, partial: 0, percentage: 0 };

    let totalActivities = 0;
    let completedActivities = 0;
    let partialActivities = 0;

    let totalCoachActivities = 0;
    let completedCoachActivities = 0;

    const coaches = equipment.applicable_coaches || [];

    equipment.sub_sections.forEach(section => {
      (section.activities || []).forEach(activity => {
        totalActivities++;
        const completions = this.getActivityCompletions(activity.id);
        const completedCoaches = Object.values(completions).filter(c => c.completed).length;
        
        if (completedCoaches >= coaches.length && coaches.length > 0) {
          completedActivities++;
        } else if (completedCoaches > 0) {
          partialActivities++;
        }

        if (coaches.length > 0) {
          totalCoachActivities += coaches.length;
          completedCoachActivities += Math.min(completedCoaches, coaches.length);
        } else {
          totalCoachActivities += 1;
          if (completedCoaches > 0) {
            completedCoachActivities += 1;
          }
        }
      });
    });

    const percentage = totalCoachActivities > 0 
      ? Utils.percentage(completedCoachActivities, totalCoachActivities) 
      : 0;

    return {
      total: totalActivities,
      completed: completedActivities,
      partial: partialActivities,
      percentage: percentage,
      totalCoachActivities: totalCoachActivities,
      completedCoachActivities: completedCoachActivities
    };
  },

  /**
   * Add activity log entry
   */
  log(action, details, status = 'success') {
    const entry = {
      id: Utils.uuid(),
      timestamp: Utils.now(),
      user: this._state.user?.name || 'System',
      action,
      details,
      status
    };

    this._state.activityLog.unshift(entry);
    
    // Keep only last 500 entries locally
    if (this._state.activityLog.length > 500) {
      this._state.activityLog = this._state.activityLog.slice(0, 500);
    }

    Utils.setLocal('9m_activity_log', this._state.activityLog);
    return entry;
  },

  /**
   * Sync pending changes with Supabase
   */
  async syncPending() {
    if (this._state.pendingSync.length === 0 || !this._state.isOnline || !window.SupabaseService || !SupabaseService.isConfigured()) return;
    
    console.log(`Syncing ${this._state.pendingSync.length} pending changes...`);
    const queue = [...this._state.pendingSync];
    const failed = [];

    for (const item of queue) {
      try {
        if (item.type === 'completion') {
          await SupabaseService.upsertCompletion(item.activityId, item.coachId, item.data);
        } else if (item.type === 'delete_completion') {
          await SupabaseService.deleteCompletion(item.activityId, item.coachId);
        } else if (item.type === 'custom_spec') {
          await SupabaseService.upsertCustomSpec(item.activityId, item.data);
        } else if (item.type === 'delete_custom_spec') {
          await SupabaseService.deleteCustomSpec(item.activityId);
        } else if (item.type === 'override') {
          await SupabaseService.upsertOverride(item.activityId, item.isRequired);
        }
      } catch (err) {
        console.warn(`Sync failed for item type ${item.type}:`, err);
        failed.push(item);
      }
    }

    this._state.pendingSync = failed;
    Utils.setLocal('9m_pending_sync', this._state.pendingSync);
    
    if (failed.length === 0) {
      this.log('sync', 'Pending changes synced successfully');
    }
  },

  /**
   * Helper to queue offline changes safely
   */
  _queuePendingSync(item) {
    this._state.pendingSync = this._state.pendingSync.filter(x => {
      if ((item.type === 'completion' || item.type === 'delete_completion') && 
          (x.type === 'completion' || x.type === 'delete_completion')) {
        return x.key !== item.key;
      }
      if (item.type === 'custom_spec' && x.type === 'custom_spec') {
        return x.activityId !== item.activityId;
      }
      if (item.type === 'override' && x.type === 'override') {
        return x.activityId !== item.activityId;
      }
      return true;
    });
    
    this._state.pendingSync.push(item);
    Utils.setLocal('9m_pending_sync', this._state.pendingSync);
  },

  /**
   * Sync entire database state on startup (bidirectional sync with conflict resolution)
   */
  async syncWithSupabase() {
    if (!this._state.isOnline || !window.SupabaseService || !SupabaseService.isConfigured()) return;

    try {
      console.log('⚡ Starting Supabase bidirectional sync...');
      
      // Flush pending queue first
      await this.syncPending();

      // Fetch from Supabase
      const [completionsList, specsList, overridesList] = await Promise.all([
        SupabaseService.fetchCompletions(),
        SupabaseService.fetchCustomSpecs(),
        SupabaseService.fetchOverrides()
      ]);

      let completionsChanged = false;
      const localCompletions = this._state.completions || {};

      if (completionsList) {
        // Create a set of keys in the database
        const dbKeys = new Set(completionsList.map(r => `${r.activity_id}_${r.coach_id}`));

        // 1. Remove local completions that are not in the database and not pending sync
        Object.keys(localCompletions).forEach(key => {
          if (!dbKeys.has(key)) {
            // Check if this key is pending sync (meaning it was created offline and not synced yet)
            const isPending = this._state.pendingSync.some(p => p.key === key && p.type === 'completion');
            if (!isPending) {
              console.log(`🗑️ Sync: Removing local completion ${key} (deleted on server)`);
              delete localCompletions[key];
              completionsChanged = true;
            }
          }
        });

        // 2. Merge database records
        completionsList.forEach(dbRecord => {
          const key = `${dbRecord.activity_id}_${dbRecord.coach_id}`;
          const localRecord = localCompletions[key];
          
          const dbRecordFormatted = {
            completed: dbRecord.completed,
            completion_date: dbRecord.completion_date,
            sse_id: dbRecord.sse_id,
            done_by_staff: dbRecord.done_by_staff || [],
            measured_value: dbRecord.measured_value,
            pass_fail_result: dbRecord.pass_fail_result,
            torque_marking_required: dbRecord.torque_marking_required,
            torque_obtained_from_manual: dbRecord.torque_obtained_from_manual,
            material_required: dbRecord.material_required,
            material_tool_name: dbRecord.material_tool_name,
            abnormality: {
              has_issue: dbRecord.abnormality_has_issue,
              issue_description: dbRecord.abnormality_issue_description,
              action_taken: dbRecord.abnormality_action_taken,
              photo: dbRecord.abnormality_photo
            },
            updatedAt: dbRecord.updated_at
          };

          if (!localRecord || new Date(dbRecord.updated_at) > new Date(localRecord.updatedAt)) {
            localCompletions[key] = dbRecordFormatted;
            completionsChanged = true;
          } else if (new Date(localRecord.updatedAt) > new Date(dbRecord.updated_at)) {
            // Local is newer, upload it back
            this._queuePendingSync({
              type: 'completion',
              key: key,
              activityId: dbRecord.activity_id,
              coachId: dbRecord.coach_id,
              data: localRecord,
              timestamp: Utils.now()
            });
          }
        });
        
        if (completionsChanged) {
          this.set('completions', localCompletions);
          Utils.setLocal('9m_completions', localCompletions);
        }
      }

      // Merge custom specifications
      let specsChanged = false;
      const localSpecs = this._state.customValueSpecs || {};

      if (specsList) {
        specsList.forEach(dbSpec => {
          const actId = dbSpec.activity_id;
          const localSpec = localSpecs[actId];

          const dbSpecFormatted = {
            title: dbSpec.title,
            fields: dbSpec.fields || [],
            updatedAt: dbSpec.updated_at
          };

          if (!localSpec || new Date(dbSpec.updated_at) > new Date(localSpec.updatedAt)) {
            localSpecs[actId] = dbSpecFormatted;
            specsChanged = true;
          } else if (new Date(localSpec.updatedAt) > new Date(dbSpec.updated_at)) {
            // Local is newer, upload it back
            this._queuePendingSync({
              type: 'custom_spec',
              activityId: actId,
              data: localSpec,
              timestamp: Utils.now()
            });
          }
        });
        
        if (specsChanged) {
          this.set('customValueSpecs', localSpecs);
          Utils.setLocal('9m_custom_value_specs', localSpecs);
        }
      }

      // Merge requirement overrides
      let overridesChanged = false;
      const localOverrides = this._state.customValueReqOverrides || {};

      if (overridesList) {
        overridesList.forEach(dbOverride => {
          const actId = dbOverride.activity_id;
          const localOverride = localOverrides[actId];

          // Use default merge if not present locally
          if (localOverride === undefined) {
            localOverrides[actId] = dbOverride.is_required;
            overridesChanged = true;
          }
        });
        
        if (overridesChanged) {
          this.set('customValueReqOverrides', localOverrides);
          Utils.setLocal('9m_custom_value_req_overrides', localOverrides);
        }
      }

      // If we discovered local updates that need uploading, sync them now
      if (this._state.pendingSync.length > 0) {
        await this.syncPending();
      }

      console.log('⚡ Supabase sync completed successfully');
      this.log('sync', 'Synchronized successfully with Supabase backend');
    } catch (err) {
      console.warn('⚠️ Supabase sync failed:', err);
    }
  },

  /**
   * Save a custom value specification for an activity
   */
  saveCustomValueSpec(activityId, spec) {
    if (!this._state.customValueSpecs) this._state.customValueSpecs = {};
    const specRecord = {
      ...spec,
      updatedAt: Utils.now()
    };
    this._state.customValueSpecs[activityId] = specRecord;
    Utils.setLocal('9m_custom_value_specs', this._state.customValueSpecs);
    this.log('save_custom_spec', `Configured custom value fields for Activity ${activityId}`);

    if (this._state.isOnline && window.SupabaseService && SupabaseService.isConfigured()) {
      SupabaseService.upsertCustomSpec(activityId, specRecord)
        .catch(err => {
          console.warn('Failed to upsert spec to Supabase, queuing:', err);
          this._queuePendingSync({
            type: 'custom_spec',
            activityId,
            data: specRecord,
            timestamp: Utils.now()
          });
        });
    } else {
      this._queuePendingSync({
        type: 'custom_spec',
        activityId,
        data: specRecord,
        timestamp: Utils.now()
      });
    }

    Utils.emit(`customSpecs:saved`, { activityId, spec: specRecord });
  },

  /**
   * Delete a custom value specification for an activity
   */
  deleteCustomValueSpec(activityId) {
    if (this._state.customValueSpecs && this._state.customValueSpecs[activityId]) {
      delete this._state.customValueSpecs[activityId];
      Utils.setLocal('9m_custom_value_specs', this._state.customValueSpecs);
      this.log('delete_custom_spec', `Deleted custom value fields for Activity ${activityId}`);

      if (this._state.isOnline && window.SupabaseService && SupabaseService.isConfigured()) {
        SupabaseService.deleteCustomSpec(activityId)
          .catch(err => {
            console.warn('Failed to delete spec from Supabase, queuing delete:', err);
            this._queuePendingSync({
              type: 'delete_custom_spec',
              activityId,
              timestamp: Utils.now()
            });
          });
      } else {
        this._queuePendingSync({
          type: 'delete_custom_spec',
          activityId,
          timestamp: Utils.now()
        });
      }

      Utils.emit(`customSpecs:deleted`, { activityId });
    }
  },

  /**
   * Save custom value requirement override (Yes/No toggle)
   */
  saveValueReqOverride(activityId, isRequired) {
    if (!this._state.customValueReqOverrides) this._state.customValueReqOverrides = {};
    this._state.customValueReqOverrides[activityId] = isRequired;
    Utils.setLocal('9m_custom_value_req_overrides', this._state.customValueReqOverrides);
    this.log('save_override', `Toggled value requirement for Activity ${activityId} to ${isRequired}`);

    if (this._state.isOnline && window.SupabaseService && SupabaseService.isConfigured()) {
      SupabaseService.upsertOverride(activityId, isRequired)
        .catch(err => {
          console.warn('Failed to save override to Supabase, queuing:', err);
          this._queuePendingSync({
            type: 'override',
            activityId,
            isRequired,
            timestamp: Utils.now()
          });
        });
    } else {
      this._queuePendingSync({
        type: 'override',
        activityId,
        isRequired,
        timestamp: Utils.now()
      });
    }

    Utils.emit(`valueReqOverride:saved`, { activityId, isRequired });
  },

  /**
   * Helper to check if values are required for an activity (incorporates user overrides)
   */
  isActivityValueRequired(activity) {
    if (!activity) return false;
    const overrides = this._state.customValueReqOverrides || {};
    if (overrides[activity.id] !== undefined) {
      return overrides[activity.id];
    }
    return !!activity.value_required;
  },

  /**
   * Load schedule data from JSON files and fetch database updates
   */
  async loadScheduleData() {
    try {
      this.set('isLoading', true);

      const [electricalRes, mechanicalRes, staffRes, coachesRes] = await Promise.all([
        fetch('data/electrical.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('data/mechanical.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('data/staff.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('data/coaches.json').then(r => r.ok ? r.json() : null).catch(() => null)
      ]);

      if (electricalRes) this.set('scheduleData.electrical', electricalRes);
      if (mechanicalRes) this.set('scheduleData.mechanical', mechanicalRes);
      if (staffRes) this.set('staffData', staffRes);
      if (coachesRes) this.set('coachData', coachesRes);

      this.set('isLoading', false);
      this.log('data_load', 'Schedule data loaded successfully');
      
      // Sync with Supabase asynchronously without blocking static data load
      this.syncWithSupabase();
      
      return true;
    } catch (err) {
      console.error('Failed to load schedule data:', err);
      this.set('isLoading', false);
      this.log('data_load', `Failed to load data: ${err.message}`, 'error');
      return false;
    }
  }
};
