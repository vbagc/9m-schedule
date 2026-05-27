/**
 * 9M Schedule PWA — Simple Hash-Based Router
 */
const Router = {
  _routes: {},
  _currentPage: null,

  /**
   * Register a route handler
   */
  register(pageName, handler) {
    this._routes[pageName] = handler;
  },

  /**
   * Initialize router — listen for hash changes
   */
  init() {
    window.addEventListener('hashchange', () => this._onHashChange());
    // Handle initial hash
    this._onHashChange();
  },

  /**
   * Navigate to a page
   */
  navigate(pageName, params = {}) {
    const paramStr = Object.keys(params).length 
      ? '?' + new URLSearchParams(params).toString()
      : '';
    window.location.hash = `#/${pageName}${paramStr}`;
  },

  /**
   * Handle hash change
   */
  _onHashChange() {
    const hash = window.location.hash.slice(2) || 'dashboard'; // Remove #/
    const [pageName, queryStr] = hash.split('?');
    const params = queryStr ? Object.fromEntries(new URLSearchParams(queryStr)) : {};

    this._showPage(pageName, params);
  },

  /**
   * Show a page and hide others
   */
  _showPage(pageName, params = {}) {
    // Store previous page
    if (this._currentPage) {
      Store.set('previousPage', this._currentPage);
    }

    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
      page.classList.remove('active', 'page-enter');
    });

    // Show target page
    const targetPage = document.getElementById(`page-${pageName}`);
    if (targetPage) {
      targetPage.classList.add('active', 'page-enter');
      this._currentPage = pageName;
      Store.set('currentPage', pageName);

      // Update bottom nav
      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === pageName);
      });

      // Call route handler if registered
      if (this._routes[pageName]) {
        this._routes[pageName](params);
      }

      // Scroll to top
      window.scrollTo(0, 0);
    } else {
      console.warn(`Page not found: ${pageName}`);
      // Fallback to dashboard
      if (pageName !== 'dashboard') {
        this.navigate('dashboard');
      }
    }
  },

  /**
   * Go back to previous page
   */
  goBack() {
    const prev = Store.get('previousPage');
    if (prev) {
      this.navigate(prev);
    } else {
      this.navigate('dashboard');
    }
  },

  /**
   * Get current page name
   */
  getCurrentPage() {
    return this._currentPage || 'dashboard';
  }
};
