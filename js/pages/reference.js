/**
 * 9M Schedule PWA — Reference Page Controller
 */
const ReferencePage = {
  _activeTab: 'electrical', // electrical | mechanical
  _searchQuery: '',

  render() {
    const page = document.getElementById('page-reference');
    
    page.innerHTML = `
      <div class="reference-header anim-fade-in-up" style="margin-bottom: var(--space-4);">
        <h2 class="schedule-title">📋 Schedule Reference</h2>
        <p class="schedule-count">Study and browse all 1,041 schedule activities in read-only mode.</p>
      </div>

      <!-- Tab Switcher -->
      <div class="filter-bar anim-fade-in-up" style="margin-bottom: var(--space-3);">
        <button class="filter-chip ${this._activeTab === 'electrical' ? 'active' : ''}" onclick="ReferencePage._setTab('electrical')" style="flex: 1; text-align: center;">⚡ Electrical Schedule</button>
        <button class="filter-chip ${this._activeTab === 'mechanical' ? 'active' : ''}" onclick="ReferencePage._setTab('mechanical')" style="flex: 1; text-align: center;">🔧 Mechanical Schedule</button>
      </div>

      <!-- Text Search within Reference -->
      <div class="search-input-wrapper anim-fade-in-up" style="margin-bottom: var(--space-4);">
        <span class="search-icon">🔍</span>
        <input 
          type="text" 
          id="reference-search-input" 
          class="search-input" 
          placeholder="Filter reference activities..."
          value="${Utils.escapeHtml(this._searchQuery)}"
        >
      </div>

      <!-- Accordion Container -->
      <div id="reference-accordion-container" class="anim-stagger" style="display: flex; flex-direction: column; gap: var(--space-2);">
        ${this._renderAccordions()}
      </div>
    `;

    // Hook search listener
    const searchBox = document.getElementById('reference-search-input');
    searchBox.addEventListener('input', Utils.debounce((e) => {
      this._searchQuery = e.target.value.trim();
      document.getElementById('reference-accordion-container').innerHTML = this._renderAccordions();
    }, 200));
  },

  _setTab(tab) {
    this._activeTab = tab;
    this.render();
  },

  _renderAccordions() {
    const data = Store.get(`scheduleData.${this._activeTab}`);
    if (!data || !data.equipment) {
      return '<div class="empty-state"><div class="empty-state-title">No data loaded</div></div>';
    }

    const query = this._searchQuery.toLowerCase();
    const equipments = data.equipment;

    // Filter equipments if search query is present
    let filteredEquips = equipments;
    if (query) {
      filteredEquips = equipments.filter(equip => {
        // Match in equipment name or any activity inside
        const nameMatch = equip.name.toLowerCase().includes(query) || (equip.short_name && equip.short_name.toLowerCase().includes(query));
        const activityMatch = equip.sub_sections.some(sec => 
          (sec.activities || []).some(act => act.description.toLowerCase().includes(query))
        );
        return nameMatch || activityMatch;
      });
    }

    if (filteredEquips.length === 0) {
      return `
        <div class="empty-state" style="padding: var(--space-6) 0;">
          <div class="empty-state-icon">📂</div>
          <div class="empty-state-title">No matches found</div>
          <div class="empty-state-text">No equipment or tasks match "${Utils.escapeHtml(this._searchQuery)}"</div>
        </div>
      `;
    }

    return filteredEquips.map(equip => {
      const stats = Store.getEquipmentStats(equip);
      const isExpanded = query ? 'expanded' : '';
      
      // Calculate how many matching activities in this section
      let matchCountText = '';
      if (query) {
        let count = 0;
        equip.sub_sections.forEach(sec => {
          (sec.activities || []).forEach(act => {
            if (act.description.toLowerCase().includes(query)) count++;
          });
        });
        matchCountText = `<span class="badge badge-primary" style="margin-left: auto;">${count} matches</span>`;
      }

      return `
        <div class="activity-item ${isExpanded}" id="ref-equip-${equip.id}" style="border-radius: var(--radius-lg);">
          <div class="activity-item-header" onclick="ReferencePage._toggleSection(${equip.id})" style="align-items: center;">
            <div class="activity-seq" style="font-weight: 700;">${equip.item_no}</div>
            <div class="activity-desc" style="font-weight: 600; color: var(--text-primary);">
              ${Utils.escapeHtml(equip.name)}
              ${equip.oem ? `<span style="font-size: 0.65rem; color: var(--text-tertiary); font-weight: normal; block-size: auto;"> [OEM: ${Utils.escapeHtml(equip.oem)}]</span>` : ''}
            </div>
            ${matchCountText}
            <span class="activity-status-icon" id="ref-icon-${equip.id}">${query ? '▼' : '▶'}</span>
          </div>

          <!-- Activities collapsible container -->
          <div class="activity-form" id="ref-details-${equip.id}" style="max-height: ${query ? '2000px' : '0'};">
            <div class="activity-form-inner" style="background: var(--bg-secondary); border-top: 1px solid var(--glass-border); padding: var(--space-3) var(--space-4);">
              <div style="font-size: var(--text-xs); color: var(--text-tertiary); margin-bottom: var(--space-3); border-bottom: 1px dashed var(--glass-border); padding-bottom: var(--space-2);">
                Applicable Coaches: ${equip.applicable_coaches?.join(', ') || 'None'}
              </div>
              <div style="display: flex; flex-direction: column; gap: var(--space-3);">
                ${equip.sub_sections.map(section => this._renderSubSection(section, query)).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  _renderSubSection(section, query) {
    const activities = section.activities || [];
    if (activities.length === 0) return '';

    // Show sub-section heading if name is not 'General'
    const showHeader = section.name !== 'General';

    // Filter activities if search query is active
    let filteredActs = activities;
    if (query) {
      filteredActs = activities.filter(act => act.description.toLowerCase().includes(query));
    }

    if (filteredActs.length === 0) return '';

    return `
      ${showHeader ? `
        <div style="font-size: var(--text-xs); font-weight: 700; color: var(--text-accent); margin-top: var(--space-1); border-left: 2px solid var(--primary-400); padding-left: var(--space-2);">
          ${section.item_no} ${Utils.escapeHtml(section.name)}
        </div>
      ` : ''}
      <div style="display: flex; flex-direction: column; gap: var(--space-2); padding-left: ${showHeader ? 'var(--space-2)' : '0'};">
        ${filteredActs.map(act => {
          let desc = Utils.escapeHtml(act.description);
          if (query) {
            // Highlight query
            const regex = new RegExp(`(${Utils.escapeRegex(query)})`, 'gi');
            desc = desc.replace(regex, '<mark style="background: rgba(245, 158, 11, 0.4); color: white; border-radius: 2px; padding: 0 2px;">$1</mark>');
          }

          return `
            <div style="display: flex; gap: var(--space-3); font-size: var(--text-xs); line-height: 1.4; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: var(--space-2);">
              <span style="color: var(--text-tertiary); font-weight: 700; font-family: monospace; min-width: 1.5rem;">${act.seq_no || '·'}</span>
              <div style="color: var(--text-secondary); flex: 1;">
                ${desc}
                ${Store.isActivityValueRequired(act) ? '<span class="badge badge-warning" style="font-size: 0.55rem; padding: 1px 4px; margin-left: 4px;">Value</span>' : ''}
                ${act.remarks ? `<div style="font-size: 0.65rem; color: var(--text-tertiary); font-style: italic; margin-top: 2px;">Remarks: ${Utils.escapeHtml(act.remarks)}</div>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  _toggleSection(equipId) {
    const detailDiv = document.getElementById(`ref-details-${equipId}`);
    const iconSpan = document.getElementById(`ref-icon-${equipId}`);
    const itemContainer = document.getElementById(`ref-equip-${equipId}`);
    
    if (detailDiv && iconSpan && itemContainer) {
      const isExpanded = itemContainer.classList.contains('expanded');
      
      if (isExpanded) {
        itemContainer.classList.remove('expanded');
        detailDiv.style.maxHeight = '0';
        iconSpan.textContent = '▶';
      } else {
        itemContainer.classList.add('expanded');
        detailDiv.style.maxHeight = '2000px';
        iconSpan.textContent = '▼';
      }
    }
  }
};
