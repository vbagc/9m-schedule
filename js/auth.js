/**
 * 9M Schedule PWA — Authentication (Simple Login)
 */
const Auth = {
  /**
   * Check if user is logged in
   */
  isLoggedIn() {
    return Store.get('user') !== null;
  },

  /**
   * Handle login
   */
  login(name, designation) {
    if (!name || !name.trim()) {
      Utils.toast('Please enter your name', 'error');
      return false;
    }
    if (!designation) {
      Utils.toast('Please select your designation', 'error');
      return false;
    }

    // Save user
    Store.setUser(name.trim(), designation);
    Utils.toast(`Welcome, ${name.trim()}! 🚄`, 'success');
    return true;
  },

  /**
   * Handle logout
   */
  logout() {
    Store.clearUser();
    Store.log('logout', 'User logged out');
    Utils.toast('Logged out successfully', 'info');
  },

  /**
   * Get current user info
   */
  getCurrentUser() {
    return Store.get('user');
  }
};
