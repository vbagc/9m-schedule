/**
 * 9M Schedule PWA — Utility Functions
 */
const Utils = {
  /**
   * Generate a UUID v4
   */
  uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  },

  /**
   * Get current ISO timestamp
   */
  now() {
    return new Date().toISOString();
  },

  /**
   * Format date to Indian format (DD/MM/YYYY)
   */
  formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },

  /**
   * Format date to readable format
   */
  formatDateReadable(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  },

  /**
   * Format time (HH:MM)
   */
  formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  },

  /**
   * Debounce function
   */
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  /**
   * Throttle function
   */
  throttle(fn, limit = 100) {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Safely get from localStorage
   */
  getLocal(key, defaultVal = null) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : defaultVal;
    } catch {
      return defaultVal;
    }
  },

  /**
   * Safely set to localStorage
   */
  setLocal(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.warn('localStorage write failed:', e);
    }
  },

  /**
   * Remove from localStorage
   */
  removeLocal(key) {
    try { localStorage.removeItem(key); } catch {}
  },

  /**
   * Show toast notification
   */
  toast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${message}</span>
      <span class="toast-close" onclick="this.parentElement.remove()">✕</span>
    `;

    container.appendChild(toast);

    // Auto-remove
    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 200);
    }, duration);
  },

  /**
   * Calculate percentage
   */
  percentage(completed, total) {
    if (!total || total === 0) return 0;
    return Math.round((completed / total) * 100);
  },

  /**
   * Create ripple effect on click
   */
  addRipple(e) {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    ripple.className = 'ripple-effect';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    el.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Truncate text
   */
  truncate(str, maxLen = 80) {
    if (!str || str.length <= maxLen) return str || '';
    return str.substring(0, maxLen) + '…';
  },

  /**
   * Create SVG circular progress ring
   */
  createProgressRing(percentage, size = 80, strokeWidth = 6, color = 'var(--primary-400)') {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return `
      <div class="progress-ring" style="width:${size}px; height:${size}px;">
        <svg width="${size}" height="${size}">
          <circle class="progress-ring-bg" 
                  cx="${size/2}" cy="${size/2}" r="${radius}" 
                  stroke-width="${strokeWidth}"/>
          <circle class="progress-ring-fill"
                  cx="${size/2}" cy="${size/2}" r="${radius}"
                  stroke="${color}"
                  stroke-width="${strokeWidth}"
                  stroke-dasharray="${circumference}"
                  stroke-dashoffset="${offset}"/>
        </svg>
        <span class="progress-ring-text" style="font-size:${size * 0.22}px;">${percentage}%</span>
      </div>
    `;
  },

  /**
   * Create linear progress bar HTML
   */
  createProgressBar(percentage, className = '') {
    const colorClass = percentage >= 100 ? 'success' : percentage >= 50 ? '' : percentage > 0 ? 'warning' : 'danger';
    return `
      <div class="progress-bar">
        <div class="progress-bar-fill ${colorClass} ${className}" style="width: ${Math.min(percentage, 100)}%"></div>
      </div>
    `;
  },

  /**
   * Simple event bus for component communication
   */
  _listeners: {},
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  },
  off(event, fn) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(f => f !== fn);
  },
  emit(event, data) {
    if (!this._listeners[event]) return;
    this._listeners[event].forEach(fn => fn(data));
  }
};
