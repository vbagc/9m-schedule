/**
 * 9M Schedule PWA — Main Application Controller
 */
const App = {
  /**
   * Initialize the application
   */
  async init() {
    console.log('🚄 9M Schedule PWA — Initializing...');

    // 1. Initialize state store
    Store.init();

    // 2. Initialize login page
    LoginPage.init();

    // 3. Check if already logged in
    if (Auth.isLoggedIn()) {
      this.showMainApp();
    }

    // 4. Setup bottom navigation
    this._setupNavigation();

    // 5. Register route handlers
    this._registerRoutes();

    // 6. Register Service Worker for PWA
    this._registerServiceWorker();

    console.log('✅ App initialized');
  },

  /**
   * Show main app (after login)
   */
  async showMainApp() {
    // Hide login, show app
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('app').classList.remove('hidden');

    // Load data
    await Store.loadScheduleData();

    // Initialize router (will navigate to current hash or dashboard)
    Router.init();

    // Render dashboard as default
    if (!window.location.hash || window.location.hash === '#/' || window.location.hash === '#/dashboard') {
      DashboardPage.render();
    }
  },

  /**
   * Navigate to a page
   */
  navigateTo(page, params = {}) {
    Router.navigate(page, params);
  },

  /**
   * Go back
   */
  goBack() {
    Router.goBack();
  },

  /**
   * Open more menu
   */
  openMoreMenu() {
    document.getElementById('more-menu').classList.add('active');
  },

  /**
   * Close more menu
   */
  closeMoreMenu() {
    document.getElementById('more-menu').classList.remove('active');
  },

  /**
   * Setup bottom navigation clicks
   */
  _setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const page = item.dataset.page;
        
        if (page === 'more') {
          this.openMoreMenu();
          return;
        }

        this.navigateTo(page);
        Utils.addRipple(e);
      });
    });

    // Close more menu on overlay click
    const moreMenu = document.getElementById('more-menu');
    if (moreMenu) {
      moreMenu.addEventListener('click', (e) => {
        if (e.target === moreMenu) {
          this.closeMoreMenu();
        }
      });
    }
  },

  /**
   * Register route handlers
   */
  _registerRoutes() {
    Router.register('dashboard', () => {
      DashboardPage.render();
    });

    Router.register('electrical', (params) => {
      this._renderSchedulePage('electrical', params);
    });

    Router.register('mechanical', (params) => {
      this._renderSchedulePage('mechanical', params);
    });

    Router.register('activity', (params) => {
      this._renderActivityPage(params);
    });

    Router.register('search', () => {
      SearchPage.render();
    });

    Router.register('reference', () => {
      ReferencePage.render();
    });

    Router.register('planning', () => {
      PlanningPage.render();
    });

    Router.register('reports', () => {
      ReportsPage.render();
    });

    Router.register('settings', () => {
      SettingsPage.render();
    });
  },

  /**
   * Render schedule equipment list page
   */
  _renderSchedulePage(type, params) {
    const page = document.getElementById(`page-${type}`);
    const data = Store.get(`scheduleData.${type}`);
    const view = Store.get('preferredView');

    if (!data || !data.equipment) {
      page.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📂</div>
          <div class="empty-state-title">Data Not Loaded</div>
          <div class="empty-state-text">Schedule data could not be loaded. Please check the data files.</div>
        </div>
      `;
      return;
    }

    const typeLabel = type === 'electrical' ? '⚡ Electrical' : '🔧 Mechanical';
    const typeColor = type === 'electrical' ? 'var(--primary-400)' : 'var(--accent-400)';
    const equipments = data.equipment;

    page.innerHTML = `
      <!-- Header -->
      <div class="schedule-header">
        <div>
          <h2 class="schedule-title">${typeLabel} Schedule</h2>
          <span class="schedule-count">${equipments.length} equipment sections</span>
        </div>
        <div class="view-toggle">
          <button class="view-toggle-btn ${view === 'card' ? 'active' : ''}" data-view="card" title="Card View" onclick="App._setView('card', '${type}')">▦</button>
          <button class="view-toggle-btn ${view === 'grid' ? 'active' : ''}" data-view="grid" title="Grid View" onclick="App._setView('grid', '${type}')">▤</button>
          <button class="view-toggle-btn ${view === 'list' ? 'active' : ''}" data-view="list" title="List View" onclick="App._setView('list', '${type}')">☰</button>
        </div>
      </div>

      <!-- Filter bar -->
      <div class="filter-bar">
        <button class="filter-chip active" data-filter="all" onclick="App._filterEquipment('all', '${type}')">All</button>
        <button class="filter-chip" data-filter="pending" onclick="App._filterEquipment('pending', '${type}')">Not Started</button>
        <button class="filter-chip" data-filter="partial" onclick="App._filterEquipment('partial', '${type}')">In Progress</button>
        <button class="filter-chip" data-filter="completed" onclick="App._filterEquipment('completed', '${type}')">Completed</button>
      </div>

      <!-- Equipment Grid -->
      <div id="${type}-equipment-grid" class="equipment-grid view-${view} anim-stagger">
        ${equipments.map(equip => this._renderEquipmentCard(equip, type)).join('')}
      </div>
    `;
  },

  /**
   * Render a single equipment card
   */
  _renderEquipmentCard(equip, type) {
    const stats = Store.getEquipmentStats(equip);
    const completedClass = stats.percentage >= 100 ? 'completed' : '';
    const coachTypes = equip.coach_types || [];
    const coaches = equip.applicable_coaches || [];

    // Badge colors for coach types
    const coachBadgeClass = (ct) => {
      switch(ct) {
        case 'DTC': return 'badge-primary';
        case 'MC1': case 'MC2': return 'badge-warning';
        case 'TC': return 'badge-success';
        case 'NDTC': return 'badge-ghost';
        default: return 'badge-ghost';
      }
    };

    return `
      <div class="equipment-card ${completedClass}" onclick="App.navigateTo('activity', {type: '${type}', equipId: ${equip.id}})">
        <div class="equipment-card-header">
          <div class="equipment-card-number">${Utils.escapeHtml(equip.item_no)}</div>
          <div class="equipment-card-info">
            <div class="equipment-card-name">${Utils.escapeHtml(equip.short_name || equip.name)}</div>
            ${equip.oem ? `<div class="equipment-card-oem">${Utils.escapeHtml(equip.oem)}</div>` : ''}
          </div>
        </div>
        <div class="equipment-card-coaches">
          ${[...new Set(coachTypes)].map(ct => `<span class="badge ${coachBadgeClass(ct)}">${ct}</span>`).join('')}
          <span class="badge badge-ghost">${coaches.length} coaches</span>
        </div>
        <div class="equipment-card-footer">
          <span class="equipment-task-count">${stats.total} activities</span>
          <div style="flex: 1; margin: 0 var(--space-3);">
            ${Utils.createProgressBar(stats.percentage)}
          </div>
          <span class="equipment-progress-text" style="color: ${stats.percentage >= 100 ? 'var(--success-400)' : stats.percentage > 0 ? 'var(--accent-400)' : 'var(--text-tertiary)'}">${stats.percentage}%</span>
        </div>
      </div>
    `;
  },

  /**
   * Set view mode
   */
  _setView(view, type) {
    Store.setPreferredView(view);
    // Re-render the page
    this._renderSchedulePage(type);
  },

  /**
   * Filter equipment cards
   */
  _filterEquipment(filter, type) {
    const data = Store.get(`scheduleData.${type}`);
    if (!data) return;

    // Update active filter chip
    document.querySelectorAll(`#page-${type} .filter-chip`).forEach(chip => {
      chip.classList.toggle('active', chip.dataset.filter === filter);
    });

    const grid = document.getElementById(`${type}-equipment-grid`);
    const view = Store.get('preferredView');
    
    let equipments = data.equipment;
    if (filter !== 'all') {
      equipments = equipments.filter(equip => {
        const stats = Store.getEquipmentStats(equip);
        switch(filter) {
          case 'pending': return stats.percentage === 0;
          case 'partial': return stats.percentage > 0 && stats.percentage < 100;
          case 'completed': return stats.percentage >= 100;
          default: return true;
        }
      });
    }

    grid.className = `equipment-grid view-${view} anim-stagger`;
    grid.innerHTML = equipments.length > 0 
      ? equipments.map(equip => this._renderEquipmentCard(equip, type)).join('')
      : `<div class="empty-state" style="grid-column: 1/-1;">
          <div class="empty-state-icon">🔍</div>
          <div class="empty-state-title">No Equipment Found</div>
          <div class="empty-state-text">No equipment matches the selected filter.</div>
        </div>`;
  },

  /**
   * Render activity detail page
   */
  _renderActivityPage(params) {
    const page = document.getElementById('page-activity');
    const type = params.type;
    const equipId = parseInt(params.equipId);

    // Save dataset for re-rendering
    page.dataset.type = type;
    page.dataset.equipId = equipId;

    const data = Store.get(`scheduleData.${type}`);
    if (!data) {
      page.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">Data not available</div></div>';
      return;
    }

    const equip = data.equipment.find(e => e.id === equipId);
    if (!equip) {
      page.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">Equipment not found</div></div>';
      return;
    }

    const stats = Store.getEquipmentStats(equip);
    const coaches = equip.applicable_coaches || [];
    const typeIcon = type === 'electrical' ? '⚡' : '🔧';

    page.innerHTML = `
      <!-- Header -->
      <div class="activity-page-header">
        <button class="back-btn" onclick="App.goBack()">←</button>
        <div style="flex:1; min-width: 0;">
          <div class="activity-equipment-name">${typeIcon} ${Utils.escapeHtml(equip.short_name || equip.name)}</div>
          <div style="font-size: var(--text-xs); color: var(--text-tertiary); margin-top: 2px;">
            ${equip.coach_types?.join(', ') || ''} • ${coaches.length} coaches • ${stats.total} activities
          </div>
        </div>
      </div>

      <!-- Progress -->
      <div style="margin-bottom: var(--space-4);">
        <div class="flex justify-between mb-2">
          <span style="font-size: var(--text-xs); color: var(--text-tertiary);">Progress</span>
          <span style="font-size: var(--text-xs); font-weight: 700; color: ${stats.percentage >= 100 ? 'var(--success-400)' : 'var(--text-primary)'};">${stats.percentage}%</span>
        </div>
        ${Utils.createProgressBar(stats.percentage)}
      </div>

      <!-- Applicable Coaches -->
      <div class="card" style="margin-bottom: var(--space-4); padding: var(--space-3) var(--space-4);">
        <div style="font-size: var(--text-xs); font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-2);">Applicable Coaches</div>
        <div style="display: flex; flex-wrap: wrap; gap: var(--space-1);">
          ${coaches.map(c => `<span class="badge badge-primary">${c}</span>`).join('')}
        </div>
      </div>

      <!-- Activity List -->
      <div class="activity-list anim-stagger">
        ${equip.sub_sections.map(section => this._renderSubSection(section, equip, type)).join('')}
      </div>
    `;
  },

  /**
   * Render a sub-section with its activities
   */
  _renderSubSection(section, equip, type) {
    const activities = section.activities || [];
    if (activities.length === 0) return '';

    // Show sub-section header only if there are multiple sub-sections
    const showHeader = equip.sub_sections.length > 1 && section.name !== 'General';

    return `
      ${showHeader ? `
        <div style="padding: var(--space-2) 0; margin-top: var(--space-2);">
          <h4 style="font-size: var(--text-sm); color: var(--text-accent); font-weight: 600;">${Utils.escapeHtml(section.item_no)} ${Utils.escapeHtml(section.name)}</h4>
        </div>
      ` : ''}
      ${activities.map(activity => this._renderActivityItem(activity, equip)).join('')}
    `;
  },

  /**
   * Render a single activity item
   */
  _renderActivityItem(activity, equip) {
    const coaches = equip.applicable_coaches || [];
    const completions = Store.getActivityCompletions(activity.id);
    const completedCount = Object.values(completions).filter(c => c.completed).length;
    
    let statusClass = '';
    let statusIcon = '○';
    if (completedCount >= coaches.length && coaches.length > 0) {
      statusClass = 'completed';
      statusIcon = '✓';
    } else if (completedCount > 0) {
      statusClass = 'partial';
      statusIcon = '◐';
    }

    const coachStatus = coaches.length > 0 
      ? ` • ${completedCount}/${coaches.length} coaches`
      : '';

    return `
      <div class="activity-item ${statusClass}" data-activity-id="${activity.id}">
        <div class="activity-item-header" onclick="App._toggleActivityForm(${activity.id})">
          <div class="activity-seq">${statusClass === 'completed' ? '✓' : activity.seq_no || '·'}</div>
          <div class="activity-desc">
            ${Utils.escapeHtml(activity.description)}
            ${Store.isActivityValueRequired(activity) ? `<span class="badge badge-warning" style="margin-left: var(--space-1);">Value</span>` : ''}
            ${coachStatus ? `<span style="font-size: var(--text-xs); color: var(--text-tertiary);">${coachStatus}</span>` : ''}
          </div>
          <span class="activity-status-icon">${statusIcon}</span>
        </div>
        <div class="activity-form" id="activity-form-${activity.id}">
          ${this._renderActivityForm(activity, equip)}
        </div>
      </div>
    `;
  },

  /**
   * Toggle activity form expansion
   */
  _toggleActivityForm(activityId) {
    const items = document.querySelectorAll('.activity-item');
    items.forEach(item => {
      if (parseInt(item.dataset.activityId) === activityId) {
        item.classList.toggle('expanded');
      } else {
        item.classList.remove('expanded');
      }
    });
  },

  /**
   * Render the activity data entry form (locally offline first)
   */
  _renderActivityForm(activity, equip) {
    const coaches = equip.applicable_coaches || [];
    const staff = Store.get('staffData') || [];
    const sses = staff.filter(s => s.is_sse);
    const techs = staff.filter(s => !s.is_sse);
    
    const completions = Store.getActivityCompletions(activity.id);
    
    let defaultDate = Utils.formatDate(new Date(), 'YYYY-MM-DD');
    let defaultSse = '';
    let defaultTechs = [];
    let defaultTorque = false;
    let defaultTorqueObtained = false;
    let defaultMaterial = false;
    let defaultMaterialName = '';

    const firstComp = Object.values(completions)[0];
    if (firstComp) {
      if (firstComp.completion_date) defaultDate = firstComp.completion_date;
      if (firstComp.sse_id) defaultSse = firstComp.sse_id;
      if (firstComp.done_by_staff && Array.isArray(firstComp.done_by_staff)) defaultTechs = firstComp.done_by_staff;
      if (firstComp.torque_marking_required) defaultTorque = true;
      if (firstComp.torque_obtained_from_manual) defaultTorqueObtained = true;
      if (firstComp.material_required) defaultMaterial = true;
      if (firstComp.material_tool_name) defaultMaterialName = firstComp.material_tool_name;
    }

    const valueReq = Store.isActivityValueRequired(activity);

    const staffCheckboxesHTML = techs.map(t => {
      const checked = defaultTechs.includes(t.id) ? 'checked' : '';
      return `
        <label class="checkbox-label" style="display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-xs); color: var(--text-secondary); cursor: pointer;">
          <input type="checkbox" name="tech-check-${activity.id}" value="${t.id}" ${checked}>
          <span>${Utils.escapeHtml(t.name)} (${Utils.escapeHtml(t.designation)})</span>
        </label>
      `;
    }).join('');

    const coachesHTML = coaches.map(coach => {
      const comp = completions[coach];
      const completed = comp && comp.completed;
      const valChecked = completed ? 'checked' : '';
      
      // Calculate summary of recorded values
      let summaryHTML = '';
      if (completed) {
        const summaryParts = [];
        if (comp.measured_value) {
          const isOut = App.isActivityValueOutOfRange(activity.id, comp.measured_value);
          const badgeStyle = isOut
            ? `font-size: 0.7rem; color: var(--danger-300); font-weight: 600; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 2px;`
            : `font-size: 0.7rem; color: var(--primary-300); font-weight: 600; background: rgba(51, 109, 194, 0.1); padding: 2px 6px; border-radius: 4px;`;
          
          try {
            const parsed = JSON.parse(comp.measured_value);
            if (typeof parsed === 'object' && parsed !== null) {
              const parts = Object.entries(parsed).map(([k, v]) => `${k}: ${v}`);
              summaryParts.push(`<span style="${badgeStyle}">${parts.join(', ')}${isOut ? ' ⚠️' : ''}</span>`);
            } else {
              summaryParts.push(`<span style="${badgeStyle}">Val: ${comp.measured_value}${isOut ? ' ⚠️' : ''}</span>`);
            }
          } catch(e) {
            summaryParts.push(`<span style="${badgeStyle}">Val: ${comp.measured_value}${isOut ? ' ⚠️' : ''}</span>`);
          }
        }
        
        if (comp.pass_fail_result) {
          const isPass = comp.pass_fail_result === 'Pass';
          summaryParts.push(`<span class="badge ${isPass ? 'badge-success' : 'badge-danger'}" style="font-size: 0.65rem; padding: 1px 6px;">${comp.pass_fail_result}</span>`);
        }
        
        if (comp.abnormality && comp.abnormality.has_issue) {
          summaryParts.push(`<span class="badge badge-danger" style="font-size: 0.65rem; padding: 1px 6px; display: inline-flex; align-items: center; gap: 2px;" title="${Utils.escapeHtml(comp.abnormality.issue_description)}">⚠️ Issue ${comp.abnormality.photo ? '📷' : ''}</span>`);
        }
        
        summaryHTML = summaryParts.join(' ');
      }
      
      const btnLabel = completed 
        ? (valueReq ? '✏️ Edit Values' : '✏️ Edit Details')
        : (valueReq ? '📝 Record Value' : '📝 Add Details');
        
      const coachesJsonEscaped = encodeURIComponent(JSON.stringify(coaches));

      return `
        <div class="coach-completion-row" style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-2) var(--space-3); background: var(--bg-tertiary); border-radius: var(--radius-md); border: 1px solid var(--glass-border); gap: var(--space-3); flex-wrap: wrap;">
          <label style="display: flex; align-items: center; gap: var(--space-2); font-weight: 600; color: var(--text-primary); cursor: pointer; margin: 0; user-select: none;">
            <input type="checkbox" id="coach-completed-${activity.id}-${coach}" onchange="App._onCoachCheckboxChange(${activity.id}, '${coach}', ${valueReq})" ${valChecked}>
            <span>Coach ${coach}</span>
          </label>
          
          <div style="display: flex; align-items: center; gap: var(--space-3); margin-left: auto;">
            ${summaryHTML}
            <button type="button" class="btn btn-outline btn-sm" style="padding: var(--space-1) var(--space-2); font-size: 0.65rem; height: auto;" onclick="App._openRecordValueModal(${activity.id}, '${coach}', '${coachesJsonEscaped}')">
              ${btnLabel}
            </button>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="activity-form-inner" style="display: flex; flex-direction: column; gap: var(--space-4);">
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
          <div class="form-group">
            <label class="form-label" style="font-size: var(--text-xs);">Completion Date</label>
            <input type="date" id="form-date-${activity.id}" class="form-input" style="padding: var(--space-2); font-size: var(--text-sm);" value="${defaultDate}">
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size: var(--text-xs);">Supervising SSE</label>
            <select id="form-sse-${activity.id}" class="form-select" style="padding: var(--space-2); font-size: var(--text-sm);">
              <option value="" disabled ${!defaultSse ? 'selected' : ''}>Select SSE</option>
              ${sses.map(s => `<option value="${s.id}" ${defaultSse == s.id ? 'selected' : ''}>${Utils.escapeHtml(s.name)}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" style="font-size: var(--text-xs);">Done By Staff</label>
          <div style="max-height: 120px; overflow-y: auto; padding: var(--space-2) var(--space-3); background: var(--bg-input); border: 1.5px solid var(--border-primary); border-radius: var(--radius-lg); display: flex; flex-direction: column; gap: var(--space-2);">
            ${staffCheckboxesHTML}
          </div>
        </div>

        <div class="form-group">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-2); padding: var(--space-2) var(--space-3); background: rgba(51, 109, 194, 0.05); border-radius: var(--radius-md); border: 1px solid var(--glass-border); gap: var(--space-2); flex-wrap: wrap;">
            <span style="font-size: 0.7rem; font-weight: 600; color: var(--text-secondary);">Require measured values for this activity?</span>
            <label class="toggle" style="margin: 0; transform: scale(0.85); transform-origin: right center;">
              <input type="checkbox" id="value-req-toggle-${activity.id}" onchange="App._toggleActivityValueRequired(${activity.id})" ${valueReq ? 'checked' : ''}>
              <span class="toggle-track"><span class="toggle-thumb"></span></span>
            </label>
          </div>
          
          <label class="form-label" style="font-size: var(--text-xs); display: flex; justify-content: space-between; align-items: center;">
            <span>Coach Completion & Values</span>
            <span style="color: var(--primary-400); cursor: pointer; font-size: 0.7rem;" onclick="App._selectAllCoachesForActivity(${activity.id}, ${JSON.stringify(coaches).replace(/"/g, '&quot;')})">Select All</span>
          </label>
          <div style="display: flex; flex-direction: column; gap: var(--space-2);">
            ${coachesHTML}
          </div>
        </div>

        <div style="padding: var(--space-3); background: rgba(245, 158, 11, 0.03); border: 1px solid rgba(245, 158, 11, 0.15); border-radius: var(--radius-md); display: flex; flex-direction: column; gap: var(--space-3);">
          <div style="display: flex; flex-wrap: wrap; gap: var(--space-4);">
            <label style="display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-xs); color: var(--text-secondary); cursor: pointer;">
              <input type="checkbox" id="form-torque-${activity.id}" onchange="App._toggleTorqueDetails(${activity.id})" ${defaultTorque ? 'checked' : ''}>
              <span>Torque marking required?</span>
            </label>

            <div id="torque-details-${activity.id}" style="display: ${defaultTorque ? 'flex' : 'none'}; align-items: center; gap: var(--space-2);">
              <label style="display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-xs); color: var(--text-secondary); cursor: pointer;">
                <input type="checkbox" id="form-torque-obtained-${activity.id}" ${defaultTorqueObtained ? 'checked' : ''}>
                <span>Obtained from manual?</span>
              </label>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: var(--space-2);">
            <label style="display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-xs); color: var(--text-secondary); cursor: pointer;">
              <input type="checkbox" id="form-material-${activity.id}" onchange="App._toggleMaterialDetails(${activity.id})" ${defaultMaterial ? 'checked' : ''}>
              <span>Material/tool required?</span>
            </label>

            <div id="material-details-${activity.id}" style="display: ${defaultMaterial ? 'block' : 'none'};">
              <input type="text" id="form-material-name-${activity.id}" class="form-input" style="padding: var(--space-2); font-size: var(--text-xs);" placeholder="Specify material or tool name" value="${Utils.escapeHtml(defaultMaterialName)}">
            </div>
          </div>
        </div>

        <div style="display: flex; gap: var(--space-2); justify-content: flex-end; margin-top: var(--space-2);">
          <button class="btn btn-ghost btn-sm" onclick="App._toggleActivityForm(${activity.id})">Cancel</button>
          <button class="btn btn-primary btn-sm" onclick="App._saveActivityCompletion(${activity.id}, ${JSON.stringify(coaches).replace(/"/g, '&quot;')}, ${valueReq})">Save Completion</button>
        </div>

      </div>
    `;
  },

  /**
   * Handle coach completed checkbox change
   */
  _onCoachCheckboxChange(activityId, coach, valueRequired) {
    const checkbox = document.getElementById(`coach-completed-${activityId}-${coach}`);
    const isChecked = checkbox ? checkbox.checked : false;
    
    if (isChecked) {
      // Validate SSE and Staff selection first
      const sseSelect = document.getElementById(`form-sse-${activityId}`);
      const sseId = sseSelect ? parseInt(sseSelect.value) : null;
      const techCheckboxes = document.querySelectorAll(`input[name="tech-check-${activityId}"]:checked`);
      
      if (!sseId || isNaN(sseId) || techCheckboxes.length === 0) {
        Utils.toast('Please select Supervising SSE and Done By Staff first', 'error');
        checkbox.checked = false; // Revert checkbox
        if (!sseId || isNaN(sseId)) sseSelect?.focus();
        return;
      }

      if (valueRequired) {
        // Open modal immediately to prompt for values
        const coaches = this._getCoachesForPage();
        this._openRecordValueModal(activityId, coach, encodeURIComponent(JSON.stringify(coaches)));
      }
    }
  },

  /**
   * Toggle activity value requirement (user custom override)
   */
  _toggleActivityValueRequired(activityId) {
    const toggle = document.getElementById(`value-req-toggle-${activityId}`);
    const isRequired = toggle ? toggle.checked : false;
    
    // Save override
    Store.saveValueReqOverride(activityId, isRequired);
    Utils.toast(isRequired ? 'Activity set to require values' : 'Activity set to simple check-off', 'info');
    
    // Re-render activity page
    const type = document.getElementById('page-activity').dataset.type;
    const equipId = document.getElementById('page-activity').dataset.equipId;
    this._renderActivityPage({ type, equipId });
  },

  /**
   * Helper to get current page's coaches
   */
  _getCoachesForPage() {
    const activePage = document.getElementById('page-activity');
    if (!activePage) return [];
    const type = activePage.dataset.type;
    const equipId = parseInt(activePage.dataset.equipId);
    const data = Store.get(`scheduleData.${type}`);
    if (data) {
      const equip = data.equipment.find(e => e.id === equipId);
      return equip ? equip.applicable_coaches || [] : [];
    }
    return [];
  },

  _selectAllCoachesForActivity(activityId, coaches) {
    const sseSelect = document.getElementById(`form-sse-${activityId}`);
    const sseId = sseSelect ? parseInt(sseSelect.value) : null;
    const techCheckboxes = document.querySelectorAll(`input[name="tech-check-${activityId}"]:checked`);
    
    if (!sseId || isNaN(sseId) || techCheckboxes.length === 0) {
      Utils.toast('Please select Supervising SSE and Done By Staff first', 'error');
      if (!sseId || isNaN(sseId)) sseSelect?.focus();
      return;
    }

    coaches.forEach(coach => {
      const checkbox = document.getElementById(`coach-completed-${activityId}-${coach}`);
      if (checkbox && !checkbox.checked) {
        checkbox.checked = true;
      }
    });
  },

  _toggleTorqueDetails(activityId) {
    const checked = document.getElementById(`form-torque-${activityId}`).checked;
    const details = document.getElementById(`torque-details-${activityId}`);
    if (details) {
      details.style.display = checked ? 'flex' : 'none';
    }
  },

  _toggleMaterialDetails(activityId) {
    const checked = document.getElementById(`form-material-${activityId}`).checked;
    const details = document.getElementById(`material-details-${activityId}`);
    if (details) {
      details.style.display = checked ? 'block' : 'none';
    }
  },

  _parseLimitValue(val) {
    if (val === null || val === undefined) return null;
    const str = String(val).trim();
    if (!str) return null;
    const match = str.match(/^[+-]?\d+(?:\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
  },

  _isOutOfRange(val, minLimitStr, maxLimitStr) {
    if (val === '' || val === null || val === undefined) return false;
    const num = parseFloat(val);
    if (isNaN(num)) return false;
    
    const min = this._parseLimitValue(minLimitStr);
    const max = this._parseLimitValue(maxLimitStr);
    
    if (min !== null && num < min) return true;
    if (max !== null && num > max) return true;
    return false;
  },

  isSingleValueOutOfRange(activityId, name, val) {
    const actResult = this._getActivity(activityId);
    if (!actResult) return false;
    const { activity } = actResult;
    const customSpec = Store.get('customValueSpecs.' + activityId);
    
    let min = null;
    let max = null;
    
    if (customSpec && Array.isArray(customSpec.fields)) {
      const fieldSpec = customSpec.fields.find(f => {
        if (typeof f === 'string') return f === name;
        return f && f.name === name;
      });
      if (fieldSpec && typeof fieldSpec === 'object') {
        min = fieldSpec.min_limit;
        max = fieldSpec.max_limit;
      }
    }
    
    if (min === null && max === null) {
      min = activity.min_limit;
      max = activity.max_limit;
    }
    
    return this._isOutOfRange(val, min, max);
  },

  isActivityValueOutOfRange(activityId, measuredValueJsonStr) {
    const actResult = this._getActivity(activityId);
    if (!actResult) return false;
    const { activity } = actResult;
    const customSpec = Store.get('customValueSpecs.' + activityId);
    
    try {
      const parsed = JSON.parse(measuredValueJsonStr);
      if (typeof parsed !== 'object' || parsed === null) {
        return this._isOutOfRange(measuredValueJsonStr, activity.min_limit, activity.max_limit);
      }
      
      for (const [key, val] of Object.entries(parsed)) {
        let min = null;
        let max = null;
        
        if (customSpec && Array.isArray(customSpec.fields)) {
          const fieldSpec = customSpec.fields.find(f => {
            if (typeof f === 'string') return f === key;
            return f && f.name === key;
          });
          if (fieldSpec && typeof fieldSpec === 'object') {
            min = fieldSpec.min_limit;
            max = fieldSpec.max_limit;
          }
        }
        
        if (min === null && max === null) {
          min = activity.min_limit;
          max = activity.max_limit;
        }
        
        if (this._isOutOfRange(val, min, max)) {
          return true;
        }
      }
    } catch(e) {
      return this._isOutOfRange(measuredValueJsonStr, activity.min_limit, activity.max_limit);
    }
    return false;
  },

  _validateRvFieldValues() {
    const rows = document.querySelectorAll('.rv-field-row');
    rows.forEach(row => {
      const valInput = row.querySelector('.rv-field-value');
      const minInput = row.querySelector('.rv-field-min');
      const maxInput = row.querySelector('.rv-field-max');
      
      if (valInput && minInput && maxInput) {
        const val = valInput.value.trim();
        const minStr = minInput.value.trim();
        const maxStr = maxInput.value.trim();
        
        const isOut = this._isOutOfRange(val, minStr, maxStr);
        if (isOut) {
          valInput.style.borderColor = 'var(--danger-500)';
          valInput.style.color = 'var(--danger-400)';
          valInput.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
          valInput.classList.add('out-of-range');
        } else {
          valInput.style.borderColor = '';
          valInput.style.color = '';
          valInput.style.backgroundColor = '';
          valInput.classList.remove('out-of-range');
        }
      }
    });
  },

  /**
   * Helper to search for activity in loaded data
   */
  _getActivity(activityId) {
    const elec = Store.get('scheduleData.electrical');
    if (elec && elec.equipment) {
      for (let eq of elec.equipment) {
        for (let sec of eq.sub_sections) {
          const act = sec.activities.find(a => a.id === activityId);
          if (act) return { activity: act, equipment: eq, type: 'electrical' };
        }
      }
    }
    const mech = Store.get('scheduleData.mechanical');
    if (mech && mech.equipment) {
      for (let eq of mech.equipment) {
        for (let sec of eq.sub_sections) {
          const act = sec.activities.find(a => a.id === activityId);
          if (act) return { activity: act, equipment: eq, type: 'mechanical' };
        }
      }
    }
    return null;
  },

  /**
   * Open the Record Value / Details Modal
   */
  _openRecordValueModal(activityId, coach, coachesJsonEsc) {
    const actResult = this._getActivity(activityId);
    if (!actResult) return;
    
    // Validate SSE and Staff selection first
    const sseSelect = document.getElementById(`form-sse-${activityId}`);
    const sseId = sseSelect ? parseInt(sseSelect.value) : null;
    const techCheckboxes = document.querySelectorAll(`input[name="tech-check-${activityId}"]:checked`);
    
    if (!sseId || isNaN(sseId) || techCheckboxes.length === 0) {
      Utils.toast('Please select Supervising SSE and Done By Staff on the activity card first', 'error');
      if (!sseId || isNaN(sseId)) sseSelect?.focus();
      return;
    }
    
    const { activity, equipment } = actResult;
    const comp = Store.getCompletion(activityId, coach) || {};
    const customSpec = Store.get('customValueSpecs.' + activityId);
    
    const modalTitle = document.getElementById('rv-modal-title');
    modalTitle.innerHTML = `⚙️ Record Value — Coach ${coach}`;
    
    const container = document.getElementById('rv-modal-content');
    
    const valueReq = Store.isActivityValueRequired(activity);
    const unit = activity.unit || '';
    
    const specTitle = customSpec?.title || activity.form_title || 'Measured Values';
    const passFailVal = comp.pass_fail_result || 'Pass';
    
    let fields = []; // Objects: { name, min_limit, max_limit }
    let parsedVals = {};
    
    if (customSpec && Array.isArray(customSpec.fields)) {
      fields = customSpec.fields.map(f => {
        if (typeof f === 'string') {
          return { name: f, min_limit: null, max_limit: null };
        }
        return {
          name: f.name || '',
          min_limit: f.min_limit !== undefined ? f.min_limit : null,
          max_limit: f.max_limit !== undefined ? f.max_limit : null
        };
      });
      if (comp.measured_value) {
        try {
          parsedVals = JSON.parse(comp.measured_value);
        } catch(e) {
          if (fields[0]) parsedVals[fields[0].name] = comp.measured_value;
        }
      }
    } else {
      let parsed = null;
      if (comp.measured_value) {
        try {
          parsed = JSON.parse(comp.measured_value);
        } catch(e) {}
      }
      
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        fields = Object.keys(parsed).map(k => {
          return { name: k, min_limit: activity.min_limit, max_limit: activity.max_limit };
        });
        parsedVals = parsed;
      } else {
        fields = [{ name: 'Value', min_limit: activity.min_limit, max_limit: activity.max_limit }];
        if (comp.measured_value) {
          parsedVals = { 'Value': comp.measured_value };
        }
      }
    }
    
    let valueFieldsHTML = '';
    
    if (valueReq) {
      const passFailHTML = `
        <div class="form-group" style="margin-bottom: var(--space-3);">
          <label class="form-label" style="font-weight: 700;">Pass / Fail Status</label>
          <select id="rv-passfail" class="form-select">
            <option value="Pass" ${passFailVal === 'Pass' ? 'selected' : ''}>Pass</option>
            <option value="Fail" ${passFailVal === 'Fail' ? 'selected' : ''}>Fail</option>
          </select>
        </div>
      `;
      
      const titleAndLimitsHeaderHTML = `
        <div class="form-group" style="margin-bottom: var(--space-3); background: rgba(51, 109, 194, 0.05); padding: var(--space-3); border-radius: var(--radius-md); border: 1px solid var(--glass-border);">
          <label class="form-label" style="font-weight: 700; color: var(--primary-400); margin-bottom: 0;">Value Title / Parameter Name</label>
          <input type="text" id="rv-title-input" class="form-input" style="margin-top: var(--space-2);" placeholder="e.g. Value" value="${Utils.escapeHtml(specTitle)}">
        </div>
      `;
      
      const fieldsListHTML = `
        <div class="form-group" style="margin-bottom: var(--space-4);">
          <label class="form-label" style="margin-bottom: var(--space-2);">
            Measurement Sub-Values & Limits ${unit ? `(${unit})` : ''}
          </label>
          
          <div style="display: flex; gap: var(--space-1.5); font-weight: 700; font-size: var(--text-xxs); color: var(--text-secondary); text-transform: uppercase; margin-bottom: var(--space-1.5); padding-left: 2px;">
            <div style="flex: 2;">Parameter Name</div>
            <div style="width: 75px; text-align: center;">Value</div>
            <div style="width: 65px; text-align: center;">Min</div>
            <div style="width: 65px; text-align: center;">Max</div>
            <div style="width: 24px;"></div>
          </div>
          
          <div id="rv-fields-list" style="display: flex; flex-direction: column; gap: var(--space-2);">
            ${fields.map((field, idx) => {
              const val = parsedVals[field.name] || '';
              return `
                <div class="rv-field-row" style="display: flex; gap: var(--space-1.5); align-items: center; margin-bottom: var(--space-1);">
                  <input type="text" class="form-input rv-field-name" style="padding: var(--space-2); font-size: var(--text-xs); flex: 2; min-width: 80px; margin:0;" placeholder="e.g. Strip ${idx+1}" value="${Utils.escapeHtml(field.name)}">
                  <input type="number" step="any" class="form-input rv-field-value" oninput="App._validateRvFieldValues()" style="padding: var(--space-2); font-size: var(--text-xs); width: 75px; min-width: 60px; margin:0;" placeholder="Value" value="${val}">
                  <input type="text" class="form-input rv-field-min" oninput="App._validateRvFieldValues()" style="padding: var(--space-2); font-size: var(--text-xs); width: 65px; min-width: 50px; margin:0;" placeholder="Min" value="${field.min_limit !== null ? Utils.escapeHtml(String(field.min_limit)) : ''}">
                  <input type="text" class="form-input rv-field-max" oninput="App._validateRvFieldValues()" style="padding: var(--space-2); font-size: var(--text-xs); width: 65px; min-width: 50px; margin:0;" placeholder="Max" value="${field.max_limit !== null ? Utils.escapeHtml(String(field.max_limit)) : ''}">
                  <button type="button" class="btn btn-ghost btn-sm" onclick="this.parentElement.remove(); App._validateRvFieldValues();" style="padding: var(--space-1); color: var(--danger-400); margin:0;" title="Delete row">✕</button>
                </div>
              `;
            }).join('')}
          </div>
          
          <div style="display: flex; gap: var(--space-2); margin-top: var(--space-2);">
            <button type="button" class="btn btn-outline btn-sm" onclick="App._addRvFieldRow()" style="font-size: 0.65rem; padding: var(--space-1) var(--space-2);">+ Add Row</button>
            <button type="button" class="btn btn-ghost btn-sm" onclick="App._deleteRvCustomSpec(${activityId})" style="font-size: 0.65rem; padding: var(--space-1) var(--space-2); color: var(--danger-400); margin-left: auto;">🗑️ Reset Template</button>
          </div>
        </div>
      `;
      
      valueFieldsHTML = passFailHTML + titleAndLimitsHeaderHTML + fieldsListHTML;
    }
    
    const hasAbnormal = comp.abnormality?.has_issue || false;
    const issueDesc = comp.abnormality?.issue_description || '';
    const actionTaken = comp.abnormality?.action_taken || '';
    const photoBase64 = comp.abnormality?.photo || '';
    
    const abnormalityHTML = `
      <div style="background: rgba(239, 68, 68, 0.03); border: 1px dashed rgba(239, 68, 68, 0.2); border-radius: var(--radius-lg); padding: var(--space-3); margin-bottom: var(--space-4);">
        <label style="display: flex; align-items: center; gap: var(--space-2); font-weight: 700; color: var(--danger-400); cursor: pointer; font-size: var(--text-xs);">
          <input type="checkbox" id="rv-abnormal-check" onchange="document.getElementById('rv-abnormal-details').style.display = this.checked ? 'flex' : 'none'" ${hasAbnormal ? 'checked' : ''}>
          <span>⚠️ Report Abnormality / Issue</span>
        </label>
        
        <div id="rv-abnormal-details" style="display: ${hasAbnormal ? 'flex' : 'none'}; flex-direction: column; gap: var(--space-3); margin-top: var(--space-3); border-top: 1px solid rgba(239, 68, 68, 0.1); padding-top: var(--space-3);">
          <div class="form-group">
            <label class="form-label" style="font-size: var(--text-xs);">Issue Description <span style="color:var(--danger-400);">*</span></label>
            <textarea id="rv-issue-desc" class="form-textarea" style="min-height: 3rem; font-size: var(--text-xs); padding: var(--space-2);" placeholder="Explain the abnormality/defect in detail">${Utils.escapeHtml(issueDesc)}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size: var(--text-xs);">Action Taken</label>
            <textarea id="rv-action-taken" class="form-textarea" style="min-height: 3rem; font-size: var(--text-xs); padding: var(--space-2);" placeholder="What correction/action was done?">${Utils.escapeHtml(actionTaken)}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size: var(--text-xs);">Attach Photograph</label>
            <div style="display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap;">
              <input type="file" id="rv-photo-input" accept="image/*" onchange="App._handleRvPhotoUpload(this)" style="font-size: 0.7rem; color: var(--text-secondary);">
              <input type="hidden" id="rv-photo-base64" value="${photoBase64}">
              <div id="rv-photo-preview-container" style="display: ${photoBase64 ? 'block' : 'none'}; position: relative;">
                <img id="rv-photo-preview" src="${photoBase64}" style="max-height: 80px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border);">
                <button type="button" onclick="App._clearRvPhoto()" style="position: absolute; top: -8px; right: -8px; width: 20px; height: 20px; border-radius: 50%; background: var(--danger-500); color: white; border: none; font-size: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-weight:700;">✕</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    container.innerHTML = `
      <div style="font-size: var(--text-xs); color: var(--text-tertiary); margin-bottom: var(--space-3); border-left: 2px solid var(--primary-400); padding-left: var(--space-2);">
        <strong>Equipment:</strong> ${Utils.escapeHtml(equipment.name)}<br>
        <strong>Activity:</strong> ${Utils.escapeHtml(activity.description)}
      </div>
      
      <form id="rv-modal-form" onsubmit="event.preventDefault();">
        ${valueFieldsHTML}
        ${abnormalityHTML}
        
        <div style="display: flex; gap: var(--space-2); justify-content: flex-end; border-top: 1px solid var(--glass-border); padding-top: var(--space-3); margin-top: var(--space-3);">
          <button type="button" class="btn btn-ghost btn-sm" onclick="App._closeRecordValueModal()">Cancel</button>
          <button type="button" class="btn btn-primary btn-sm" onclick="App._saveRvModalData(${activityId}, '${coach}', ${valueReq})">Save Details</button>
        </div>
      </form>
    `;
    
    if (valueReq) {
      this._validateRvFieldValues();
    }
    
    document.getElementById('record-value-modal').classList.add('active');
  },

  _addRvFieldRow() {
    const list = document.getElementById('rv-fields-list');
    if (list) {
      const idx = list.querySelectorAll('.rv-field-row').length + 1;
      const row = document.createElement('div');
      row.className = 'rv-field-row';
      row.style.display = 'flex';
      row.style.gap = 'var(--space-1.5)';
      row.style.alignItems = 'center';
      row.style.marginBottom = 'var(--space-1)';
      row.innerHTML = `
        <input type="text" class="form-input rv-field-name" style="padding: var(--space-2); font-size: var(--text-xs); flex: 2; min-width: 80px; margin:0;" placeholder="e.g. Strip ${idx}" value="Strip ${idx}">
        <input type="number" step="any" class="form-input rv-field-value" oninput="App._validateRvFieldValues()" style="padding: var(--space-2); font-size: var(--text-xs); width: 75px; min-width: 60px; margin:0;" placeholder="Value">
        <input type="text" class="form-input rv-field-min" oninput="App._validateRvFieldValues()" style="padding: var(--space-2); font-size: var(--text-xs); width: 65px; min-width: 50px; margin:0;" placeholder="Min">
        <input type="text" class="form-input rv-field-max" oninput="App._validateRvFieldValues()" style="padding: var(--space-2); font-size: var(--text-xs); width: 65px; min-width: 50px; margin:0;" placeholder="Max">
        <button type="button" class="btn btn-ghost btn-sm" onclick="this.parentElement.remove(); App._validateRvFieldValues();" style="padding: var(--space-1); color: var(--danger-400); margin:0;">✕</button>
      `;
      list.appendChild(row);
      this._validateRvFieldValues();
    }
  },

  _handleRvPhotoUpload(input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      document.getElementById('rv-photo-base64').value = base64;
      document.getElementById('rv-photo-preview').src = base64;
      document.getElementById('rv-photo-preview-container').style.display = 'block';
    };
    reader.readAsDataURL(file);
  },
  
  _clearRvPhoto() {
    document.getElementById('rv-photo-base64').value = '';
    document.getElementById('rv-photo-input').value = '';
    document.getElementById('rv-photo-preview-container').style.display = 'none';
  },

  _closeRecordValueModal() {
    document.getElementById('record-value-modal').classList.remove('active');
    
    // Auto uncheck checkboxes on main page if modal cancelled and no completions exist
    const activePage = document.getElementById('page-activity');
    if (activePage && activePage.dataset.type) {
      const type = activePage.dataset.type;
      const equipId = parseInt(activePage.dataset.equipId);
      const data = Store.get(`scheduleData.${type}`);
      if (data) {
        const equip = data.equipment.find(e => e.id === equipId);
        if (equip) {
          equip.sub_sections.forEach(sec => {
            sec.activities.forEach(act => {
              equip.applicable_coaches.forEach(coach => {
                const checkbox = document.getElementById(`coach-completed-${act.id}-${coach}`);
                if (checkbox && checkbox.checked) {
                  const comp = Store.getCompletion(act.id, coach);
                  if (!comp || !comp.completed) {
                    checkbox.checked = false;
                  }
                }
              });
            });
          });
        }
      }
    }
  },

  _deleteRvCustomSpec(activityId) {
    if (confirm('Are you sure you want to reset this activity spec template back to default?')) {
      Store.deleteCustomValueSpec(activityId);
      this._closeRecordValueModal();
      Utils.toast('Template reset to default', 'info');
      
      // Re-render main page
      const type = document.getElementById('page-activity').dataset.type;
      const equipId = document.getElementById('page-activity').dataset.equipId;
      this._renderActivityPage({ type, equipId });
    }
  },

  _saveRvModalData(activityId, coach, valueRequired) {
    let measuredValue = '';
    let passFailResult = '';
    
    const passFailSelect = document.getElementById('rv-passfail');
    if (passFailSelect) {
      passFailResult = passFailSelect.value;
    }
    
    const titleInput = document.getElementById('rv-title-input');
    const title = titleInput ? titleInput.value.trim() : '';
    
    const nameInputs = document.querySelectorAll('.rv-field-name');
    const valInputs = document.querySelectorAll('.rv-field-value');
    const minInputs = document.querySelectorAll('.rv-field-min');
    const maxInputs = document.querySelectorAll('.rv-field-max');
    
    const fields = [];
    const customValues = {};
    let anyEmpty = false;
    
    nameInputs.forEach((nameInp, i) => {
      const fName = nameInp.value.trim();
      const fVal = valInputs[i] ? valInputs[i].value.trim() : '';
      const fMin = minInputs[i] ? minInputs[i].value.trim() : '';
      const fMax = maxInputs[i] ? maxInputs[i].value.trim() : '';
      
      if (fName) {
        fields.push({
          name: fName,
          min_limit: fMin !== '' ? fMin : null,
          max_limit: fMax !== '' ? fMax : null
        });
        customValues[fName] = fVal;
        if (fVal === '') anyEmpty = true;
      }
    });
    
    if (valueRequired && fields.length > 0 && anyEmpty) {
      Utils.toast('Please enter values for all sub-value fields', 'error');
      return;
    }
    
    if (titleInput) {
      Store.saveCustomValueSpec(activityId, {
        title: title || 'Measured Values',
        fields: fields
      });
    }
    
    if (fields.length > 0) {
      measuredValue = JSON.stringify(customValues);
    }
    
    const isAbnormal = document.getElementById('rv-abnormal-check')?.checked || false;
    const issueDescription = document.getElementById('rv-issue-desc')?.value.trim() || '';
    const actionTaken = document.getElementById('rv-action-taken')?.value.trim() || '';
    const photoBase64 = document.getElementById('rv-photo-base64')?.value || '';
    
    if (isAbnormal && !issueDescription) {
      Utils.toast('Please enter abnormality description', 'error');
      document.getElementById('rv-issue-desc')?.focus();
      return;
    }
    
    const dateInput = document.getElementById(`form-date-${activityId}`);
    const sseSelect = document.getElementById(`form-sse-${activityId}`);
    const date = dateInput ? dateInput.value : Utils.formatDate(new Date(), 'YYYY-MM-DD');
    const sseId = sseSelect ? parseInt(sseSelect.value) : null;
    const techCheckboxes = document.querySelectorAll(`input[name="tech-check-${activityId}"]:checked`);
    const doneByStaff = Array.from(techCheckboxes).map(cb => parseInt(cb.value));
    
    if (!sseId || isNaN(sseId)) {
      Utils.toast('Please select a Supervising SSE first', 'error');
      if (sseSelect) sseSelect.focus();
      return;
    }
    if (doneByStaff.length === 0) {
      Utils.toast('Please select at least one Done By Staff member first', 'error');
      return;
    }
    
    const compData = {
      completed: true,
      completion_date: date,
      sse_id: sseId,
      done_by_staff: doneByStaff,
      measured_value: measuredValue,
      pass_fail_result: passFailResult,
      abnormality: {
        has_issue: isAbnormal,
        issue_description: issueDescription,
        action_taken: actionTaken,
        photo: photoBase64
      }
    };
    
    Store.saveCompletion(activityId, coach, compData);
    
    const checkbox = document.getElementById(`coach-completed-${activityId}-${coach}`);
    if (checkbox) {
      checkbox.checked = true;
    }
    
    this._closeRecordValueModal();
    Utils.toast(`Saved successfully for Coach ${coach}!`, 'success');
    
    // Re-render activity page
    const type = document.getElementById('page-activity').dataset.type;
    const equipId = document.getElementById('page-activity').dataset.equipId;
    this._renderActivityPage({ type, equipId });
  },

  _saveActivityCompletion(activityId, coaches, valueRequired) {
    const dateInput = document.getElementById(`form-date-${activityId}`);
    const sseSelect = document.getElementById(`form-sse-${activityId}`);
    const date = dateInput ? dateInput.value : '';
    const sseId = sseSelect ? parseInt(sseSelect.value) : null;

    const techCheckboxes = document.querySelectorAll(`input[name="tech-check-${activityId}"]:checked`);
    const doneByStaff = Array.from(techCheckboxes).map(cb => parseInt(cb.value));

    // Check if at least one coach is checked as completed
    let anyCoachCompleted = false;
    coaches.forEach(coach => {
      if (document.getElementById(`coach-completed-${activityId}-${coach}`)?.checked) {
        anyCoachCompleted = true;
      }
    });

    if (anyCoachCompleted) {
      if (!sseId || isNaN(sseId)) {
        Utils.toast('Please select Supervising SSE', 'error');
        if (sseSelect) sseSelect.focus();
        return;
      }
      if (doneByStaff.length === 0) {
        Utils.toast('Please select at least one Done By Staff member', 'error');
        return;
      }
    }

    const torqueMarkingRequired = document.getElementById(`form-torque-${activityId}`)?.checked || false;
    const torqueObtainedFromManual = document.getElementById(`form-torque-obtained-${activityId}`)?.checked || false;
    const materialRequired = document.getElementById(`form-material-${activityId}`)?.checked || false;
    const materialToolName = document.getElementById(`form-material-name-${activityId}`)?.value.trim() || '';

    let validationFailed = false;

    // Verify if all checked coaches have the required values entered
    if (valueRequired) {
      coaches.forEach(coach => {
        const isCompleted = document.getElementById(`coach-completed-${activityId}-${coach}`)?.checked || false;
        if (isCompleted) {
          const comp = Store.getCompletion(activityId, coach);
          if (!comp || (!comp.measured_value && !comp.pass_fail_result)) {
            Utils.toast(`Values not recorded for Coach ${coach}. Please click "Record Value"`, 'error');
            validationFailed = true;
          }
        }
      });
    }

    if (validationFailed) return;

    // Loop through all coaches and update their metadata
    coaches.forEach(coach => {
      const isCompleted = document.getElementById(`coach-completed-${activityId}-${coach}`)?.checked || false;
      const existing = Store.getCompletion(activityId, coach);
      
      if (isCompleted) {
        const measuredValue = existing ? existing.measured_value : '';
        const passFailResult = existing ? existing.pass_fail_result : '';
        const abnormalityObj = existing ? existing.abnormality : { has_issue: false, issue_description: '', action_taken: '', photo: '' };
        
        const completionData = {
          completed: true,
          completion_date: date,
          sse_id: sseId,
          done_by_staff: doneByStaff,
          measured_value: measuredValue,
          pass_fail_result: passFailResult,
          torque_marking_required: torqueMarkingRequired,
          torque_obtained_from_manual: torqueObtainedFromManual,
          material_required: materialRequired,
          material_tool_name: materialToolName,
          abnormality: abnormalityObj
        };
        Store.saveCompletion(activityId, coach, completionData);
      } else {
        if (existing) {
          delete Store.get('completions')[`${activityId}_${coach}`];
          Utils.setLocal('9m_completions', Store.get('completions'));
        }
      }
    });

    Utils.toast('Activity completion saved!', 'success');
    
    // Collapse the form
    const item = document.querySelector(`.activity-item[data-activity-id="${activityId}"]`);
    if (item) {
      item.classList.remove('expanded');
    }

    // Re-render
    const type = document.getElementById('page-activity').dataset.type;
    const equipId = document.getElementById('page-activity').dataset.equipId;
    this._renderActivityPage({ type, equipId });
  },

  _toggleActivityForm(activityId) {
    const items = document.querySelectorAll('.activity-item');
    items.forEach(item => {
      if (parseInt(item.dataset.activityId) === activityId) {
        item.classList.toggle('expanded');
      } else {
        item.classList.remove('expanded');
      }
    });
  },

  /**
   * Register Service Worker
   */
  _registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => {
            console.log('🚄 sw.js: Service Worker registered successfully', reg.scope);
          })
          .catch((err) => {
            console.error('🚄 sw.js: Service Worker registration failed', err);
          });
      });
    }
  },

  /**
   * Render placeholder page
   */
  _renderPlaceholderPage(pageId, icon, title, description) {
    const page = document.getElementById(`page-${pageId}`);
    page.innerHTML = `
      <div class="empty-state anim-fade-in-up">
        <div class="empty-state-icon">${icon}</div>
        <div class="empty-state-title">${title}</div>
        <div class="empty-state-text">${description}</div>
        <p style="margin-top: var(--space-4); font-size: var(--text-xs); color: var(--text-tertiary);">
          🚧 Coming in next development phase
        </p>
      </div>
    `;
  }
};

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
