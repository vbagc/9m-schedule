/**
 * 9M Schedule PWA — Login Page Controller
 */
const LoginPage = {
  init() {
    const form = document.getElementById('login-form');
    const nameInput = document.getElementById('login-name');
    const designationSelect = document.getElementById('login-designation');

    // Pre-fill from last login
    const lastUser = Utils.getLocal('9m_user');
    if (lastUser) {
      nameInput.value = lastUser.name || '';
      if (lastUser.designation) {
        designationSelect.value = lastUser.designation;
      }
    }

    // Handle form submit
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const name = nameInput.value.trim();
      const designation = designationSelect.value;

      if (!name) {
        nameInput.classList.add('anim-shake');
        setTimeout(() => nameInput.classList.remove('anim-shake'), 500);
        Utils.toast('Please enter your name', 'error');
        return;
      }

      if (!designation) {
        designationSelect.classList.add('anim-shake');
        setTimeout(() => designationSelect.classList.remove('anim-shake'), 500);
        Utils.toast('Please select your designation', 'error');
        return;
      }

      const success = Auth.login(name, designation);
      if (success) {
        App.showMainApp();
      }
    });

    // Add ripple effect to login button
    const loginBtn = document.getElementById('login-btn');
    loginBtn.addEventListener('click', Utils.addRipple);
  }
};
