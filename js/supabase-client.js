/**
 * 9M Schedule PWA — Supabase Client Wrapper
 * Dynamically initializes connection using credentials stored in localStorage.
 */
const SupabaseService = {
  client: null,

  /**
   * Initialize Supabase client using stored keys
   */
  init() {
    const url = Utils.getLocal('9m_supabase_url', '');
    const key = Utils.getLocal('9m_supabase_anon_key', '');

    if (url && key && window.supabase) {
      try {
        this.client = window.supabase.createClient(url, key);
        console.log('⚡ Supabase Client initialized successfully');
      } catch (err) {
        console.error('❌ Failed to initialize Supabase client:', err);
        this.client = null;
      }
    } else {
      this.client = null;
    }
  },

  /**
   * Check if client is initialized and ready
   */
  isConfigured() {
    return this.client !== null;
  },

  /**
   * Test connection credentials before saving
   */
  async testConnection(url, key) {
    if (!url || !key) {
      return { success: false, message: 'URL and Anon Key are required.' };
    }
    if (!window.supabase) {
      return { success: false, message: 'Supabase SDK not loaded.' };
    }

    try {
      const tempClient = window.supabase.createClient(url, key);
      // Try to query count of completions to check connection and permissions
      const { data, error } = await tempClient
        .from('completions')
        .select('*')
        .limit(1);

      if (error) {
        return { success: false, message: `Database error: ${error.message}` };
      }
      return { success: true, message: 'Connection successful!' };
    } catch (err) {
      return { success: false, message: `Network/Connection error: ${err.message}` };
    }
  },

  /**
   * Fetch all records from completions table
   */
  async fetchCompletions() {
    if (!this.isConfigured()) return null;
    const { data, error } = await this.client.from('completions').select('*');
    if (error) throw error;
    return data;
  },

  /**
   * Upsert a completion record to Supabase
   */
  async upsertCompletion(activityId, coachId, record) {
    if (!this.isConfigured()) return false;
    
    // Map offline schema to database schema
    const dbRecord = {
      activity_id: activityId,
      coach_id: coachId,
      completed: record.completed,
      completion_date: record.completion_date,
      sse_id: record.sse_id,
      done_by_staff: record.done_by_staff || [],
      measured_value: record.measured_value,
      pass_fail_result: record.pass_fail_result,
      torque_marking_required: record.torque_marking_required || false,
      torque_obtained_from_manual: record.torque_obtained_from_manual || false,
      material_required: record.material_required || false,
      material_tool_name: record.material_tool_name || '',
      abnormality_has_issue: record.abnormality?.has_issue || false,
      abnormality_issue_description: record.abnormality?.issue_description || '',
      abnormality_action_taken: record.abnormality?.action_taken || '',
      abnormality_photo: record.abnormality?.photo || '',
      updated_at: record.updatedAt || new Date().toISOString()
    };

    const { error } = await this.client.from('completions').upsert(dbRecord);
    if (error) throw error;
    return true;
  },

  /**
   * Delete a completion record from Supabase
   */
  async deleteCompletion(activityId, coachId) {
    if (!this.isConfigured()) return false;
    const { error } = await this.client
      .from('completions')
      .delete()
      .eq('activity_id', activityId)
      .eq('coach_id', coachId);
    if (error) throw error;
    return true;
  },

  /**
   * Fetch all custom value specs
   */
  async fetchCustomSpecs() {
    if (!this.isConfigured()) return null;
    const { data, error } = await this.client.from('custom_value_specs').select('*');
    if (error) throw error;
    return data;
  },

  /**
   * Upsert a custom value spec template
   */
  async upsertCustomSpec(activityId, spec) {
    if (!this.isConfigured()) return false;
    const { error } = await this.client.from('custom_value_specs').upsert({
      activity_id: activityId,
      title: spec.title,
      fields: spec.fields || [],
      updated_at: spec.updatedAt || new Date().toISOString()
    });
    if (error) throw error;
    return true;
  },

  /**
   * Delete a custom value spec template
   */
  async deleteCustomSpec(activityId) {
    if (!this.isConfigured()) return false;
    const { error } = await this.client
      .from('custom_value_specs')
      .delete()
      .eq('activity_id', activityId);
    if (error) throw error;
    return true;
  },

  /**
   * Fetch all requirement overrides
   */
  async fetchOverrides() {
    if (!this.isConfigured()) return null;
    const { data, error } = await this.client.from('custom_value_req_overrides').select('*');
    if (error) throw error;
    return data;
  },

  /**
   * Upsert a requirement override
   */
  async upsertOverride(activityId, isRequired) {
    if (!this.isConfigured()) return false;
    const { error } = await this.client.from('custom_value_req_overrides').upsert({
      activity_id: activityId,
      is_required: isRequired,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
    return true;
  },

  /**
   * Insert activity log entry
   */
  async insertLog(entry) {
    if (!this.isConfigured()) return false;
    const { error } = await this.client.from('activity_logs').insert({
      id: entry.id,
      timestamp: entry.timestamp,
      user_name: entry.user,
      action: entry.action,
      details: entry.details,
      status: entry.status
    });
    if (error) {
      console.warn('⚠️ Failed to sync log to Supabase:', error);
      return false;
    }
    return true;
  }
};
