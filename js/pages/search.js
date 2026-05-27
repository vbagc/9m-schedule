/**
 * 9M Schedule PWA — Search Page Controller
 */
const SearchPage = {
  _filters: {
    query: '',
    type: 'all',
    equipId: 'all',
    status: 'all'
  },
  _aiMode: false,

  render() {
    const page = document.getElementById('page-search');
    
    // Get all equipment sections for filter dropdown
    const electrical = Store.get('scheduleData.electrical')?.equipment || [];
    const mechanical = Store.get('scheduleData.mechanical')?.equipment || [];
    const allEquip = [
      ...electrical.map(e => ({ ...e, type: 'electrical', prefix: '⚡' })),
      ...mechanical.map(e => ({ ...e, type: 'mechanical', prefix: '🔧' }))
    ];

    page.innerHTML = `
      <div class="search-header anim-fade-in-up" style="margin-bottom: var(--space-4);">
        <h2 class="schedule-title">🔍 Smart Search</h2>
        <p class="schedule-count">Find activities instantly by text description, coach, or status.</p>
      </div>

      <!-- Search Input -->
      <div class="search-input-wrapper anim-fade-in-up" style="display: flex; gap: var(--space-2); align-items: center; margin-bottom: var(--space-3);">
        <div style="position: relative; flex: 1; display: flex; align-items: center;">
          <span class="search-icon" style="position: absolute; left: 12px; color: var(--text-tertiary);">🔍</span>
          <input 
            type="text" 
            id="search-box-input" 
            class="search-input" 
            style="padding-left: 36px; width: 100%;"
            placeholder="Type keywords or ask AI (e.g. fan pending, RMPU checks)..."
            value="${Utils.escapeHtml(this._filters.query)}"
          >
        </div>
        <button id="search-submit-btn" class="btn btn-primary" style="display: ${this._aiMode ? 'block' : 'none'}; padding: 0 var(--space-4); height: 46px; border-radius: var(--radius-lg); font-size: var(--text-sm); font-weight: 600; white-space: nowrap; margin: 0;">
          Ask AI
        </button>
      </div>

      <!-- AI Mode Toggle -->
      <div class="card anim-fade-in-up" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); padding: var(--space-3) var(--space-4); background: rgba(51, 109, 194, 0.05); border: 1px solid var(--glass-border); flex-direction: row; gap: var(--space-2);">
        <div style="display: flex; align-items: center; gap: var(--space-3);">
          <span style="font-size: var(--text-base);">✨</span>
          <div style="text-align: left;">
            <div style="font-size: var(--text-xs); font-weight: 700; color: var(--text-primary);">Semantic Search (AI Mode)</div>
            <div style="font-size: var(--text-xxs); color: var(--text-tertiary);">Search using Hinglish or Hindi (e.g. "transformer completed ones")</div>
          </div>
        </div>
        <label class="toggle" style="margin: 0; transform: scale(0.85); transform-origin: right center;">
          <input type="checkbox" id="search-ai-toggle" ${this._aiMode ? 'checked' : ''} onchange="SearchPage._toggleAiMode(this.checked)">
          <span class="toggle-track"><span class="toggle-thumb"></span></span>
        </label>
      </div>

      <!-- Filters Panel -->
      <div class="search-filters anim-fade-in-up">
        <div style="font-size: var(--text-xs); font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: var(--space-2); text-align: left;">Filter Results</div>
        
        <div style="display: grid; grid-template-columns: 1fr; gap: var(--space-2);">
          
          <div style="display: flex; gap: var(--space-2);">
            <select id="search-filter-type" class="form-select" style="padding: var(--space-2); font-size: var(--text-xs); flex: 1;">
              <option value="all" ${this._filters.type === 'all' ? 'selected' : ''}>All Schedules</option>
              <option value="electrical" ${this._filters.type === 'electrical' ? 'selected' : ''}>⚡ Electrical</option>
              <option value="mechanical" ${this._filters.type === 'mechanical' ? 'selected' : ''}>🔧 Mechanical</option>
            </select>

            <select id="search-filter-status" class="form-select" style="padding: var(--space-2); font-size: var(--text-xs); flex: 1;">
              <option value="all" ${this._filters.status === 'all' ? 'selected' : ''}>All Statuses</option>
              <option value="completed" ${this._filters.status === 'completed' ? 'selected' : ''}>Completed</option>
              <option value="partial" ${this._filters.status === 'partial' ? 'selected' : ''}>In Progress</option>
              <option value="pending" ${this._filters.status === 'pending' ? 'selected' : ''}>Not Started</option>
            </select>
          </div>

          <select id="search-filter-equip" class="form-select" style="padding: var(--space-2); font-size: var(--text-xs); width: 100%;">
            <option value="all" ${this._filters.equipId === 'all' ? 'selected' : ''}>All Equipment Sections</option>
            ${allEquip.map(e => `
              <option value="${e.type}_${e.id}" ${this._filters.equipId === `${e.type}_${e.id}` ? 'selected' : ''}>
                ${e.prefix} ${Utils.escapeHtml(e.short_name || e.name)}
              </option>
            `).join('')}
          </select>

        </div>
      </div>

      <!-- Results Info -->
      <div id="search-results-info" style="font-size: var(--text-xs); color: var(--text-tertiary); margin-bottom: var(--space-3); font-weight: 500; text-align: left;">
        Searching...
      </div>

      <!-- Results Container -->
      <div id="search-results-container" class="activity-list anim-stagger">
        <!-- Results will render here -->
      </div>
    `;

    // Hook listeners
    const searchBox = document.getElementById('search-box-input');
    const typeSelect = document.getElementById('search-filter-type');
    const statusSelect = document.getElementById('search-filter-status');
    const equipSelect = document.getElementById('search-filter-equip');
    const submitBtn = document.getElementById('search-submit-btn');

    const triggerSearch = () => {
      if (this._aiMode) return; // In AI mode, search only fires on button or enter
      this._filters.query = searchBox.value.trim();
      this._filters.type = typeSelect.value;
      this._filters.status = statusSelect.value;
      this._filters.equipId = equipSelect.value;
      this._executeSearch();
    };

    searchBox.addEventListener('input', Utils.debounce(triggerSearch, 250));
    typeSelect.addEventListener('change', triggerSearch);
    statusSelect.addEventListener('change', triggerSearch);
    equipSelect.addEventListener('change', triggerSearch);

    searchBox.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this._aiMode) {
        this._executeAiSearch(searchBox.value.trim());
      }
    });

    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        this._executeAiSearch(searchBox.value.trim());
      });
    }

    // Initial search execution
    this._executeSearch();
  },

  _toggleAiMode(enabled) {
    this._aiMode = enabled;
    const submitBtn = document.getElementById('search-submit-btn');
    if (submitBtn) {
      submitBtn.style.display = enabled ? 'block' : 'none';
    }
    // Perform instant local search if switching back to normal mode
    if (!enabled) {
      const searchBox = document.getElementById('search-box-input');
      this._filters.query = searchBox ? searchBox.value.trim() : '';
      this._executeSearch();
    }
  },

  _getEquipmentRefList() {
    const electrical = Store.get('scheduleData.electrical')?.equipment || [];
    const mechanical = Store.get('scheduleData.mechanical')?.equipment || [];
    const list = [];
    electrical.forEach(e => {
      list.push({ id: e.id, name: e.short_name || e.name, type: 'electrical' });
    });
    mechanical.forEach(e => {
      list.push({ id: e.id, name: e.short_name || e.name, type: 'mechanical' });
    });
    return list;
  },

  _showLoadingSkeleton() {
    const container = document.getElementById('search-results-container');
    const resultsInfo = document.getElementById('search-results-info');
    if (resultsInfo) resultsInfo.textContent = 'AI is translating query to filters...';
    if (container) {
      container.innerHTML = `
        <div class="skeleton-loader" style="display:flex; flex-direction:column; gap: var(--space-3); padding-top: var(--space-2);">
          <div style="height: 65px; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: var(--radius-md); animation: glowPulse 1.5s infinite;"></div>
          <div style="height: 65px; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: var(--radius-md); animation: glowPulse 1.5s infinite; animation-delay: 0.2s;"></div>
          <div style="height: 65px; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: var(--radius-md); animation: glowPulse 1.5s infinite; animation-delay: 0.4s;"></div>
        </div>
      `;
    }
  },

  async _callGroqAPI(query) {
    const key = Utils.getLocal('9m_groq_api_key', '');
    if (!key) {
      throw new Error('Groq API Key not found. Please save it in the settings first.');
    }

    const equipList = this._getEquipmentRefList();
    const systemPrompt = `You are a helper that translates natural language search queries (in English, Hindi, or Hinglish) for Vande Bharat maintenance activities into a structured JSON filter.
The user wants to filter maintenance activities.
Here is the dynamic list of Equipment IDs and Names:
${JSON.stringify(equipList)}

The JSON schema you must return is:
{
  "type": "electrical" | "mechanical" | "all",
  "status": "completed" | "partial" | "pending" | "all",
  "equipment_id": number | null, // Match the closest equipment ID from the list, or null if not specified
  "keywords": ["word1", "word2"] // Array of search keywords in English (translate Hindi/Hinglish search terms like "pankha" to "fan" or keep original if specific)
}

Guidelines:
- If query mentions "chala", "hua", "ho gaya", "complete", "done", status is "completed".
- If query mentions "baki", "pending", "nahi hua", "not started", status is "pending".
- If query mentions "adhoora", "in progress", status is "partial".
- Match Hinglish terms:
  - "chakka", "wheel" -> Wheel & Axle (ID 1001)
  - "pantry", "khana", "oven" -> Pantry Equipment (ID 36)
  - "rmpu", "ac", "air condition" -> Roof Mounted AC Package Unit (ID 31 or 32)
  - "panto", "pantograph" -> Pantograph (ID 6)
  - "break", "brake" -> Brake System (ID 1003)
- Respond ONLY with the raw JSON object. Do not include any markdown formatting, explanation, or extra text.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.1,
        max_tokens: 150,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Groq request failed');
    }

    const resData = await response.json();
    const content = resData.choices?.[0]?.message?.content;
    return JSON.parse(content);
  },

  async _executeAiSearch(query) {
    if (!query) return;
    
    const key = Utils.getLocal('9m_groq_api_key', '');
    if (!key) {
      Utils.toast('Please configure your Groq API Key in Settings first', 'error');
      this._toggleAiMode(false);
      const toggleCheck = document.getElementById('search-ai-toggle');
      if (toggleCheck) toggleCheck.checked = false;
      return;
    }

    this._showLoadingSkeleton();

    try {
      const filters = await this._callGroqAPI(query);
      console.log('✨ AI parsed search filter:', filters);

      // Apply the parsed filters to our local state
      this._filters.query = (filters.keywords || []).join(' ');
      this._filters.type = filters.type || 'all';
      this._filters.status = filters.status || 'all';
      
      if (filters.equipment_id) {
        const refList = this._getEquipmentRefList();
        const matched = refList.find(e => e.id === filters.equipment_id);
        if (matched) {
          this._filters.equipId = `${matched.type}_${matched.id}`;
        } else {
          this._filters.equipId = 'all';
        }
      } else {
        this._filters.equipId = 'all';
      }

      // Re-render UI inputs to reflect AI filters
      const typeSelect = document.getElementById('search-filter-type');
      const statusSelect = document.getElementById('search-filter-status');
      const equipSelect = document.getElementById('search-filter-equip');
      
      if (typeSelect) typeSelect.value = this._filters.type;
      if (statusSelect) statusSelect.value = this._filters.status;
      if (equipSelect) equipSelect.value = this._filters.equipId;

      // Execute search and display AI tag
      this._executeSearch(true, filters);
    } catch (err) {
      Utils.toast(`AI Search failed: ${err.message}`, 'error');
      this._executeSearch(); // fallback to normal search
    }
  },

  _clearAiFilter() {
    this._filters = {
      query: '',
      type: 'all',
      equipId: 'all',
      status: 'all'
    };
    
    // Clear elements
    const searchBox = document.getElementById('search-box-input');
    const typeSelect = document.getElementById('search-filter-type');
    const statusSelect = document.getElementById('search-filter-status');
    const equipSelect = document.getElementById('search-filter-equip');
    
    if (searchBox) searchBox.value = '';
    if (typeSelect) typeSelect.value = 'all';
    if (statusSelect) statusSelect.value = 'all';
    if (equipSelect) equipSelect.value = 'all';

    this._executeSearch();
  },

  _executeSearch(isAi = false, aiFilters = null) {
    const resultsContainer = document.getElementById('search-results-container');
    const resultsInfo = document.getElementById('search-results-info');
    if (!resultsContainer) return;

    const electrical = Store.get('scheduleData.electrical')?.equipment || [];
    const mechanical = Store.get('scheduleData.mechanical')?.equipment || [];

    const query = this._filters.query.toLowerCase();
    const typeFilter = this._filters.type;
    const statusFilter = this._filters.status;
    const equipFilter = this._filters.equipId;

    let searchPool = [];

    // Filter schedules (electrical/mechanical)
    if (typeFilter === 'all' || typeFilter === 'electrical') {
      electrical.forEach(equip => {
        equip.sub_sections.forEach(sec => {
          (sec.activities || []).forEach(act => {
            searchPool.push({ ...act, equip, type: 'electrical', typeIcon: '⚡' });
          });
        });
      });
    }

    if (typeFilter === 'all' || typeFilter === 'mechanical') {
      mechanical.forEach(equip => {
        equip.sub_sections.forEach(sec => {
          (sec.activities || []).forEach(act => {
            searchPool.push({ ...act, equip, type: 'mechanical', typeIcon: '🔧' });
          });
        });
      });
    }

    // Apply equipment filter
    if (equipFilter !== 'all') {
      const [type, id] = equipFilter.split('_');
      const equipId = parseInt(id);
      searchPool = searchPool.filter(item => item.type === type && item.equip.id === equipId);
    }

    // Apply text query (handles multiple keywords via AND operator)
    if (query) {
      const keywords = query.split(/\s+/).filter(k => k.length > 0);
      searchPool = searchPool.filter(item => {
        const itemText = (
          item.description + ' ' + 
          (item.remarks || '') + ' ' + 
          item.equip.name + ' ' + 
          (item.equip.oem || '')
        ).toLowerCase();
        
        return keywords.every(kw => itemText.includes(kw));
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      searchPool = searchPool.filter(item => {
        const coaches = item.equip.applicable_coaches || [];
        const completions = Store.getActivityCompletions(item.id);
        const completedCount = Object.values(completions).filter(c => c.completed).length;

        if (statusFilter === 'completed') {
          return completedCount >= coaches.length && coaches.length > 0;
        } else if (statusFilter === 'partial') {
          return completedCount > 0 && completedCount < coaches.length;
        } else if (statusFilter === 'pending') {
          return completedCount === 0;
        }
        return true;
      });
    }

    // Render results info text
    if (isAi && aiFilters) {
      const parsedText = [];
      if (aiFilters.type !== 'all') parsedText.push(`Type: ${aiFilters.type}`);
      if (aiFilters.status !== 'all') parsedText.push(`Status: ${aiFilters.status}`);
      if (aiFilters.equipment_id) {
        const ref = this._getEquipmentRefList().find(e => e.id === aiFilters.equipment_id);
        if (ref) parsedText.push(`Section: ${ref.name}`);
      }
      if (aiFilters.keywords && aiFilters.keywords.length > 0) parsedText.push(`Keywords: "${aiFilters.keywords.join(', ')}"`);
      
      resultsInfo.innerHTML = `
        <div style="background: rgba(51, 109, 194, 0.1); border: 1px solid rgba(51, 109, 194, 0.2); padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); margin-bottom: var(--space-2);">
          <span style="color: var(--primary-300); font-weight: 600; font-size: var(--text-xs);">✨ AI filters: ${parsedText.join(' • ')}</span>
          <span style="font-size: 0.65rem; color: var(--primary-400); cursor: pointer; text-decoration: underline; font-weight:600;" onclick="SearchPage._clearAiFilter()">Reset Filters</span>
        </div>
        Found ${searchPool.length} matching activities
      `;
    } else {
      resultsInfo.textContent = `Found ${searchPool.length} matching activities`;
    }

    if (searchPool.length === 0) {
      resultsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <div class="empty-state-title">No Results Found</div>
          <div class="empty-state-text">Try adjusting your filters or keywords.</div>
        </div>
      `;
      return;
    }

    // Cap results at 100 for render performance
    const displayPool = searchPool.slice(0, 100);

    resultsContainer.innerHTML = displayPool.map(act => {
      const coaches = act.equip.applicable_coaches || [];
      const completions = Store.getActivityCompletions(act.id);
      const completedCount = Object.values(completions).filter(c => c.completed).length;
      
      let statusClass = '';
      let statusText = 'Pending';
      if (completedCount >= coaches.length && coaches.length > 0) {
        statusClass = 'completed';
        statusText = 'Completed';
      } else if (completedCount > 0) {
        statusClass = 'partial';
        statusText = `${completedCount}/${coaches.length} Coaches`;
      }

      return `
        <div class="activity-item ${statusClass}" onclick="App.navigateTo('activity', {type: '${act.type}', equipId: ${act.equip.id}})" style="cursor: pointer; padding: var(--space-3) var(--space-4); text-align: left;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3); margin-bottom: var(--space-1);">
            <div style="font-size: var(--text-xs); color: var(--primary-400); font-weight: 600;">
              ${act.typeIcon} ${Utils.escapeHtml(act.equip.short_name || act.equip.name)}
            </div>
            <span class="badge ${statusClass === 'completed' ? 'badge-success' : statusClass === 'partial' ? 'badge-warning' : 'badge-ghost'}" style="font-size: 0.6rem;">
              ${statusText}
            </span>
          </div>
          <div style="font-size: var(--text-sm); color: var(--text-secondary); line-height: var(--leading-normal); font-weight: 500;">
            ${Utils.escapeHtml(act.description)}
          </div>
          ${act.remarks ? `
            <div style="font-size: 0.7rem; color: var(--text-tertiary); font-style: italic; margin-top: 4px;">
              Note: ${Utils.escapeHtml(act.remarks)}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
    
    if (searchPool.length > 100) {
      resultsContainer.innerHTML += `
        <p style="text-align: center; font-size: var(--text-xs); color: var(--text-tertiary); padding: var(--space-4);">
          Showing first 100 results. Please narrow down your search queries.
        </p>
      `;
    }
  }
};
