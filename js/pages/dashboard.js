/**
 * 9M Schedule PWA — Dashboard Page Controller
 */
const DashboardPage = {
  render() {
    const page = document.getElementById('page-dashboard');
    const user = Store.get('user');
    const electrical = Store.get('scheduleData.electrical');
    const mechanical = Store.get('scheduleData.mechanical');

    // Calculate stats
    const elecStats = this._calcScheduleStats(electrical);
    const mechStats = this._calcScheduleStats(mechanical);
    const overallTotal = elecStats.total + mechStats.total;
    const overallCompleted = elecStats.completed + mechStats.completed;
    const overallPct = Utils.percentage(overallCompleted, overallTotal);
    const elecPct = Utils.percentage(elecStats.completed, elecStats.total);
    const mechPct = Utils.percentage(mechStats.completed, mechStats.total);

    page.innerHTML = `
      <!-- Header -->
      <div class="dashboard-header anim-fade-in-up">
        <p class="dashboard-greeting">Welcome back,</p>
        <h2 class="dashboard-user">${Utils.escapeHtml(user?.name || 'User')}</h2>
        <div class="dashboard-rake-info">
          <span class="dashboard-rake-dot"></span>
          <span>${Utils.escapeHtml(user?.designation || '')} • VB 20176 Rake 42</span>
        </div>
      </div>

      <!-- Progress Rings -->
      <div class="dashboard-progress anim-stagger">
        <div style="text-align:center;">
          ${Utils.createProgressRing(overallPct, 90, 7, overallPct >= 100 ? 'var(--success-400)' : 'var(--primary-400)')}
          <p class="progress-ring-label">Overall</p>
        </div>
        <div style="text-align:center;">
          ${Utils.createProgressRing(elecPct, 78, 6, 'var(--info-400)')}
          <p class="progress-ring-label">Electrical</p>
        </div>
        <div style="text-align:center;">
          ${Utils.createProgressRing(mechPct, 78, 6, 'var(--accent-400)')}
          <p class="progress-ring-label">Mechanical</p>
        </div>
      </div>

      <!-- Brief Info -->
      <div class="dashboard-brief anim-fade-in-up">
        <h3>📋 About This App</h3>
        <p>
          This PWA tracks the <strong>9-Monthly (9M) Maintenance Schedule</strong> for 
          <strong>Vande Bharat Express VB 20176 (Rake 42)</strong> at AGC Depot. 
          It covers ${elecStats.total} electrical and ${mechStats.total} mechanical activities 
          across ${electrical?.equipment?.length || 0} electrical and ${mechanical?.equipment?.length || 0} mechanical equipment sections 
          for all 16 coaches of the trainset.
        </p>
      </div>

      <!-- Action Cards -->
      <div class="dashboard-actions anim-stagger">
        <div class="action-card action-card-electrical card-interactive" onclick="App.navigateTo('electrical')">
          <div class="action-card-icon">⚡</div>
          <div class="action-card-content">
            <div class="action-card-title">9M Electrical Schedule</div>
            <div class="action-card-stats">${elecStats.completed}/${elecStats.total} activities • ${elecPct}% done</div>
            <div style="margin-top: var(--space-2);">
              ${Utils.createProgressBar(elecPct)}
            </div>
          </div>
          <span class="action-card-arrow">→</span>
        </div>

        <div class="action-card action-card-mechanical card-interactive" onclick="App.navigateTo('mechanical')">
          <div class="action-card-icon">🔧</div>
          <div class="action-card-content">
            <div class="action-card-title">9M Mechanical Schedule</div>
            <div class="action-card-stats">${mechStats.completed}/${mechStats.total} activities • ${mechPct}% done</div>
            <div style="margin-top: var(--space-2);">
              ${Utils.createProgressBar(mechPct)}
            </div>
          </div>
          <span class="action-card-arrow">→</span>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="dashboard-stats anim-stagger">
        <div class="stat-card">
          <div class="stat-value">${overallTotal}</div>
          <div class="stat-label">Total Activities</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: var(--success-400)">${overallCompleted}</div>
          <div class="stat-label">Completed</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: var(--accent-400)">${elecStats.partial + mechStats.partial}</div>
          <div class="stat-label">In Progress</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: var(--danger-400)">${overallTotal - overallCompleted - elecStats.partial - mechStats.partial}</div>
          <div class="stat-label">Pending</div>
        </div>
      </div>
    `;

    // Add ripple to action cards
    page.querySelectorAll('.action-card').forEach(card => {
      card.addEventListener('click', Utils.addRipple);
    });
  },

  /**
   * Calculate stats for a schedule (electrical or mechanical)
   */
  _calcScheduleStats(scheduleData) {
    if (!scheduleData || !scheduleData.equipment) {
      return { total: 0, completed: 0, partial: 0, percentage: 0 };
    }

    let total = 0, completed = 0, partial = 0;

    scheduleData.equipment.forEach(equip => {
      const stats = Store.getEquipmentStats(equip);
      total += stats.total;
      completed += stats.completed;
      partial += stats.partial;
    });

    return { total, completed, partial, percentage: Utils.percentage(completed, total) };
  }
};
