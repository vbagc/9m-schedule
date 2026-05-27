/**
 * 9M Schedule PWA — Settings Page Controller
 */
const SettingsPage = {
  render() {
    const page = document.getElementById('page-settings');
    const currentTheme = Store.get('theme') || 'dark';
    const apiKey = Utils.getLocal('9m_groq_api_key', '');
    const logs = Store.get('activityLog') || [];

    page.innerHTML = `
      <div class="settings-header anim-fade-in-up" style="margin-bottom: var(--space-4);">
        <h2 class="schedule-title">⚙️ Settings & Logs</h2>
        <p class="schedule-count">Manage application preferences, API keys, and local database sync.</p>
      </div>

      <!-- Theme Preferences Card -->
      <div class="card anim-fade-in-up" style="margin-bottom: var(--space-4);">
        <h3 style="font-size: var(--text-sm); font-weight: 700; text-transform: uppercase; margin-bottom: var(--space-3); color: var(--primary-400);">Appearance Theme</h3>
        <div style="display: flex; gap: var(--space-2);">
          <button class="filter-chip ${currentTheme === 'dark' ? 'active' : ''}" onclick="SettingsPage._changeTheme('dark')" style="flex:1; justify-content: center;">🌙 Dark</button>
          <button class="filter-chip ${currentTheme === 'light' ? 'active' : ''}" onclick="SettingsPage._changeTheme('light')" style="flex:1; justify-content: center;">☀️ Light</button>
          <button class="filter-chip ${currentTheme === 'system' ? 'active' : ''}" onclick="SettingsPage._changeTheme('system')" style="flex:1; justify-content: center;">💻 System</button>
        </div>
      </div>

      <!-- Groq API Configuration Card -->
      <div class="card anim-fade-in-up" style="margin-bottom: var(--space-4);">
        <h3 style="font-size: var(--text-sm); font-weight: 700; text-transform: uppercase; margin-bottom: var(--space-3); color: var(--primary-400);">Groq AI Integration</h3>
        <div style="display: flex; flex-direction: column; gap: var(--space-3);">
          <div class="form-group">
            <label class="form-label" for="settings-api-key">Groq API Key (Llama 3.3)</label>
            <input 
              type="password" 
              id="settings-api-key" 
              class="form-input" 
              placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxx"
              value="${Utils.escapeHtml(apiKey)}"
            >
          </div>
          
          <div style="display: flex; gap: var(--space-2);">
            <button class="btn btn-outline btn-sm" style="flex:1;" onclick="SettingsPage._testGroqKey()">Test API Key</button>
            <button class="btn btn-primary btn-sm" style="flex:1;" onclick="SettingsPage._saveGroqKey()">Save Key</button>
          </div>
        </div>
      </div>

      <!-- Supabase Configuration Card -->
      <div class="card anim-fade-in-up" style="margin-bottom: var(--space-4);">
        <h3 style="font-size: var(--text-sm); font-weight: 700; text-transform: uppercase; margin-bottom: var(--space-3); color: var(--primary-400);">Supabase Backend Settings</h3>
        <p style="font-size: var(--text-xs); color: var(--text-tertiary); margin: 0 0 var(--space-3) 0;">Configure dynamic connection to sync completed schedules to Supabase cloud database.</p>
        <div style="display: flex; flex-direction: column; gap: var(--space-3);">
          <div class="form-group">
            <label class="form-label" for="settings-supabase-url">Supabase Project URL</label>
            <input 
              type="text" 
              id="settings-supabase-url" 
              class="form-input" 
              placeholder="https://xxxxxx.supabase.co"
              value="${Utils.escapeHtml(Utils.getLocal('9m_supabase_url', ''))}"
            >
          </div>
          <div class="form-group">
            <label class="form-label" for="settings-supabase-key">Supabase Anon Key</label>
            <input 
              type="password" 
              id="settings-supabase-key" 
              class="form-input" 
              placeholder="eyJhbGciOi..."
              value="${Utils.escapeHtml(Utils.getLocal('9m_supabase_anon_key', ''))}"
            >
          </div>
          
          <div style="display: flex; gap: var(--space-2);">
            <button class="btn btn-outline btn-sm" style="flex:1;" onclick="SettingsPage._testSupabaseConnection()">Test Connection</button>
            <button class="btn btn-primary btn-sm" style="flex:1;" onclick="SettingsPage._saveSupabaseConnection()">Save Connection</button>
          </div>
          <button class="btn btn-success btn-sm" style="width: 100%; margin-top: var(--space-1); font-weight: 600;" onclick="SettingsPage._triggerSupabaseSync()">🔄 Sync from Supabase</button>
        </div>
      </div>

      <!-- Database Actions Card -->
      <div class="card anim-fade-in-up" style="margin-bottom: var(--space-4);">
        <h3 style="font-size: var(--text-sm); font-weight: 700; text-transform: uppercase; margin-bottom: var(--space-3); color: var(--primary-400);">Local Database Management</h3>
        <p style="font-size: var(--text-xs); color: var(--text-tertiary); margin: 0 0 var(--space-3) 0;">Export, import, or clear all saved completions recorded offline.</p>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-2);">
          <button class="btn btn-outline btn-sm" onclick="SettingsPage._exportCompletions()">Export completions</button>
          <button class="btn btn-outline btn-sm" onclick="SettingsPage._importCompletions()">Import completions</button>
          <button class="btn btn-outline btn-sm" onclick="SettingsPage._clearLocalCompletionsOnly()" style="color: var(--warning-400); border-color: rgba(245, 158, 11, 0.3);">🗑️ Clear Local Completions Only</button>
          <button class="btn btn-danger btn-sm" onclick="SettingsPage._resetDatabase()">⚠️ Reset App Database</button>
        </div>
        <input type="file" id="import-completions-file" style="display:none;" accept=".json" onchange="SettingsPage._handleImportFile(event)">
      </div>

      <!-- Activity Log Viewer Card -->
      <div class="card anim-fade-in-up" style="padding: var(--space-4);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
          <h3 style="font-size: var(--text-sm); font-weight: 700; text-transform: uppercase; color: var(--primary-400); margin:0;">Local Activity Log</h3>
          <span style="font-size: var(--text-xs); color: var(--text-tertiary); font-weight: 500;">Last ${logs.length} events</span>
        </div>
        
        <div style="max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: var(--space-2); background: var(--bg-tertiary); border: 1px solid var(--glass-border); padding: var(--space-2); border-radius: var(--radius-md);">
          ${logs.length === 0 ? `
            <p style="text-align: center; color: var(--text-tertiary); font-size: var(--text-xs); padding: var(--space-4);">No events logged yet.</p>
          ` : logs.map(log => `
            <div style="font-size: 0.65rem; line-height: 1.4; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: var(--space-1);">
              <div style="display: flex; justify-content: space-between; color: var(--text-tertiary);">
                <span><strong>[${log.action.toUpperCase()}]</strong> by ${Utils.escapeHtml(log.user)}</span>
                <span>${Utils.escapeHtml(log.timestamp.slice(11, 19))}</span>
              </div>
              <div style="color: var(--text-secondary); margin-top: 2px;">
                ${Utils.escapeHtml(log.details)}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  _changeTheme(theme) {
    Store.setTheme(theme);
    this.render();
    Utils.toast(`Theme set to ${theme}`, 'success');
  },

  _saveGroqKey() {
    const key = document.getElementById('settings-api-key').value.trim();
    Utils.setLocal('9m_groq_api_key', key);
    Utils.toast('API Key saved successfully!', 'success');
    Store.log('save_key', 'Groq API key updated');
  },

  async _testGroqKey() {
    const key = document.getElementById('settings-api-key').value.trim();
    if (!key) {
      Utils.toast('Please enter a key to test', 'error');
      return;
    }

    Utils.toast('Testing connection to Groq API...', 'info');

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 5
        })
      });

      if (response.ok) {
        Utils.toast('Groq Connection Successful! ✅', 'success');
        Store.log('test_key', 'Groq API connection test successful');
      } else {
        const err = await response.json();
        Utils.toast(`Groq Error: ${err.error?.message || 'Connection failed'}`, 'error');
        Store.log('test_key', 'Groq API connection test failed', 'error');
      }
    } catch (err) {
      Utils.toast(`Network Error: ${err.message}`, 'error');
      Store.log('test_key', `Groq connection network error: ${err.message}`, 'error');
    }
  },

  _exportCompletions() {
    const completions = Store.get('completions');
    if (!completions || Object.keys(completions).length === 0) {
      Utils.toast('No completions to export', 'warning');
      return;
    }

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(completions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `9m_completions_${Utils.formatDate(new Date(), 'YYYYMMDD_HHmm')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    Utils.toast('Export file downloaded!', 'success');
    Store.log('export_data', 'Exported completions to JSON file');
  },

  _importCompletions() {
    document.getElementById('import-completions-file').click();
  },

  _handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (typeof imported !== 'object') throw new Error('Invalid JSON format');

        const current = Store.get('completions') || {};
        const merged = { ...current, ...imported };

        Store.set('completions', merged);
        Utils.setLocal('9m_completions', merged);
        Utils.toast(`Successfully imported completions!`, 'success');
        Store.log('import_data', `Imported completions from JSON file`);
        this.render();
      } catch (err) {
        Utils.toast(`Import failed: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
  },

  _saveSupabaseConnection() {
    const url = document.getElementById('settings-supabase-url').value.trim();
    const key = document.getElementById('settings-supabase-key').value.trim();
    
    Utils.setLocal('9m_supabase_url', url);
    Utils.setLocal('9m_supabase_anon_key', key);
    
    // Re-initialize SupabaseClient
    SupabaseService.init();
    
    Utils.toast('Supabase settings saved successfully!', 'success');
    Store.log('save_supabase', 'Supabase backend connection updated');
    this.render();
  },

  async _testSupabaseConnection() {
    const url = document.getElementById('settings-supabase-url').value.trim();
    const key = document.getElementById('settings-supabase-key').value.trim();
    
    if (!url || !key) {
      Utils.toast('Please enter both Supabase URL and Anon Key to test', 'error');
      return;
    }

    Utils.toast('Testing connection to Supabase...', 'info');
    const result = await SupabaseService.testConnection(url, key);
    
    if (result.success) {
      Utils.toast('Supabase Connection Successful! ✅', 'success');
    } else {
      Utils.toast(result.message, 'error');
    }
  },

  _clearLocalCompletionsOnly() {
    if (confirm('Are you sure you want to delete all local completion records and sync queues? This keeps your Supabase settings intact.')) {
      Store.set('completions', {});
      Store.set('pendingSync', []);
      Utils.setLocal('9m_completions', {});
      Utils.setLocal('9m_pending_sync', []);
      
      Utils.toast('Local completions and sync queue cleared successfully!', 'success');
      Store.log('clear_local_completions', 'Cleared local completion records only');
      this.render();
    }
  },

  async _triggerSupabaseSync() {
    if (!window.SupabaseService || !SupabaseService.isConfigured()) {
      Utils.toast('Supabase is not configured yet. Please configure and save settings first.', 'error');
      return;
    }
    
    Utils.toast('Synchronizing data with Supabase...', 'info');
    
    try {
      await Store.syncWithSupabase();
      Utils.toast('App synchronized with Supabase data! ✅', 'success');
      this.render();
    } catch (err) {
      Utils.toast(`Sync failed: ${err.message}`, 'error');
    }
  },

  _resetDatabase() {
    if (confirm('Are you absolutely sure you want to reset all completion data? This will clear all offline progress!')) {
      Store.clearUser();
      
      // Clear data
      Utils.removeLocal('9m_completions');
      Utils.removeLocal('9m_pending_sync');
      Utils.removeLocal('9m_plans');
      Utils.removeLocal('9m_user');
      Utils.removeLocal('9m_activity_log');
      Utils.removeLocal('9m_custom_value_specs');
      Utils.removeLocal('9m_custom_value_req_overrides');
      Utils.removeLocal('9m_supabase_url');
      Utils.removeLocal('9m_supabase_anon_key');
      
      Utils.toast('App database has been reset. Reloading...', 'success');
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }
};
