/**
 * 9M Schedule PWA — Planning Page Controller
 */
const PlanningPage = {
  render() {
    const page = document.getElementById('page-planning');
    let plans = Store.get('plans');
    
    // Fallback/Init if not set
    if (!plans) {
      plans = Utils.getLocal('9m_plans', []);
      Store.set('plans', plans);
    }

    // Render HTML structure
    page.innerHTML = `
      <div class="planning-header anim-fade-in-up" style="margin-bottom: var(--space-4);">
        <h2 class="schedule-title">📅 Maintenance Planning</h2>
        <p class="schedule-count">Notes and plans for future maintenance activities.</p>
      </div>

      <!-- Add New Plan Card -->
      <div class="card anim-fade-in-up" style="margin-bottom: var(--space-4);">
        <h3 style="font-size: var(--text-sm); font-weight: 700; text-transform: uppercase; margin-bottom: var(--space-3); color: var(--primary-400);">Add New Plan</h3>
        <form id="plan-form" style="display: flex; flex-direction: column; gap: var(--space-3);" autocomplete="off">
          <div class="form-group">
            <label class="form-label" for="plan-title">Plan Title</label>
            <input type="text" id="plan-title" class="form-input" placeholder="e.g. Roof Mounted AC servicing" required>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-3);">
            <div class="form-group">
              <label class="form-label" for="plan-date">Target Date</label>
              <input type="date" id="plan-date" class="form-input" required>
            </div>
            
            <div class="form-group">
              <label class="form-label" for="plan-priority">Priority</label>
              <select id="plan-priority" class="form-select">
                <option value="Low">🟢 Low</option>
                <option value="Medium" selected>🟡 Medium</option>
                <option value="High">🔴 High</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="plan-desc">Description / Notes</label>
            <textarea id="plan-desc" class="form-textarea" placeholder="Add additional details, material required, etc." style="min-height: 3.5rem;"></textarea>
          </div>

          <button type="submit" class="btn btn-primary btn-block btn-sm ripple">Create Plan</button>
        </form>
      </div>

      <!-- Plans List -->
      <div style="display: flex; flex-direction: column; gap: var(--space-3);">
        <h3 style="font-size: var(--text-sm); font-weight: 700; text-transform: uppercase; margin-bottom: var(--space-1); color: var(--text-secondary);">Active Plans (${plans.length})</h3>
        <div id="plans-container" class="anim-stagger" style="display: flex; flex-direction: column; gap: var(--space-3);">
          ${this._renderPlansList(plans)}
        </div>
      </div>
    `;

    // Add submit listener
    const form = document.getElementById('plan-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this._addPlan();
    });
  },

  _renderPlansList(plans) {
    if (plans.length === 0) {
      return `
        <div class="empty-state" style="padding: var(--space-8) var(--space-4);">
          <div class="empty-state-icon">📅</div>
          <div class="empty-state-title">No Plans Added</div>
          <div class="empty-state-text">Create future schedule plans and note tasks here.</div>
        </div>
      `;
    }

    // Sort plans by target date (ascending)
    const sorted = [...plans].sort((a, b) => new Date(a.date) - new Date(b.date));

    return sorted.map(plan => {
      const priorityClass = plan.priority === 'High' ? 'badge-danger' : plan.priority === 'Medium' ? 'badge-warning' : 'badge-success';
      const statusClass = plan.completed ? 'completed' : '';
      const statusText = plan.completed ? 'Completed' : 'Pending';
      const textDecor = plan.completed ? 'line-through; opacity: 0.6;' : '';

      return `
        <div class="card ${statusClass}" data-plan-id="${plan.id}" style="padding: var(--space-4); border-left: 4px solid ${plan.priority === 'High' ? 'var(--danger-500)' : plan.priority === 'Medium' ? 'var(--warning-500)' : 'var(--success-500)'};">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4);">
            <div style="flex: 1; min-width: 0; text-decoration: ${textDecor}">
              <div style="display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;">
                <h4 style="font-weight: 700; font-size: var(--text-sm); color: var(--text-primary); margin: 0;">${Utils.escapeHtml(plan.title)}</h4>
                <span class="badge ${priorityClass}">${plan.priority}</span>
              </div>
              <p style="font-size: var(--text-xs); color: var(--text-tertiary); margin: 2px 0 var(--space-2) 0;">Target Date: ${Utils.escapeHtml(plan.date)}</p>
              ${plan.description ? `<p style="font-size: var(--text-xs); color: var(--text-secondary); line-height: var(--leading-relaxed); margin: 0;">${Utils.escapeHtml(plan.description)}</p>` : ''}
            </div>
            
            <div style="display: flex; flex-direction: column; gap: var(--space-2); align-items: flex-end;">
              <!-- Toggle completed -->
              <button class="btn btn-sm ${plan.completed ? 'btn-ghost' : 'btn-outline'}" onclick="PlanningPage._togglePlanStatus('${plan.id}')" style="padding: 2px var(--space-2); font-size: 0.65rem;">
                ${plan.completed ? '✓ Mark Pending' : 'Mark Done'}
              </button>
              <!-- Delete button -->
              <button class="btn btn-ghost btn-sm" onclick="PlanningPage._deletePlan('${plan.id}')" style="padding: 2px var(--space-2); font-size: 0.65rem; color: var(--danger-400);">
                Delete
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  _addPlan() {
    const titleInput = document.getElementById('plan-title');
    const dateInput = document.getElementById('plan-date');
    const prioritySelect = document.getElementById('plan-priority');
    const descTextarea = document.getElementById('plan-desc');

    const newPlan = {
      id: Utils.uuid(),
      title: titleInput.value.trim(),
      date: dateInput.value,
      priority: prioritySelect.value,
      description: descTextarea.value.trim(),
      completed: false,
      createdAt: Utils.now()
    };

    const plans = Store.get('plans') || [];
    plans.push(newPlan);
    
    // Save to Store and Local
    Store.set('plans', plans);
    Utils.setLocal('9m_plans', plans);
    
    // Log the event
    Store.log('add_plan', `Added planning note: "${newPlan.title}"`);

    Utils.toast('Plan added successfully!', 'success');
    
    // Re-render
    this.render();
  },

  _togglePlanStatus(planId) {
    const plans = Store.get('plans') || [];
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      plan.completed = !plan.completed;
      Store.set('plans', plans);
      Utils.setLocal('9m_plans', plans);
      Store.log('toggle_plan', `Marked plan "${plan.title}" as ${plan.completed ? 'completed' : 'pending'}`);
      this.render();
    }
  },

  _deletePlan(planId) {
    let plans = Store.get('plans') || [];
    const planToDelete = plans.find(p => p.id === planId);
    plans = plans.filter(p => p.id !== planId);
    
    Store.set('plans', plans);
    Utils.setLocal('9m_plans', plans);
    
    if (planToDelete) {
      Store.log('delete_plan', `Deleted plan: "${planToDelete.title}"`);
    }

    Utils.toast('Plan deleted', 'info');
    this.render();
  }
};
