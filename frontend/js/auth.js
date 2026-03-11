/**
 * ============================================================
 * AUTH.JS — The Gardner Hub Authentication Logic
 * Vanilla JavaScript — Login & Registration handlers
 * ============================================================
 */

const API_BASE = 'http://localhost:5000/api';

// ── PASSWORD VISIBILITY TOGGLE ──────────────────────────────
function togglePasswordVisibility(button) {
  const targetId = button.getAttribute('data-target');
  const input = document.getElementById(targetId);
  const eyeIcon = button.querySelector('.eye-icon');
  const eyeOffIcon = button.querySelector('.eye-off-icon');

  if (input.type === 'password') {
    input.type = 'text';
    eyeIcon.classList.add('hidden');
    eyeOffIcon.classList.remove('hidden');
  } else {
    input.type = 'password';
    eyeIcon.classList.remove('hidden');
    eyeOffIcon.classList.add('hidden');
  }
}

// ── LOGIN FORM HANDLER ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Theme is already initialised by theme.js (loaded in <head>)

  // Attach password toggle listeners
  document.querySelectorAll('.toggle-password').forEach((btn) => {
    btn.addEventListener('click', () => togglePasswordVisibility(btn));
  });

  // ── FORGOT PASSWORD MODAL LOGIC ──────────────────────────────
  const forgotBtn = document.getElementById('forgotPasswordBtn');
  const modal = document.getElementById('forgotPasswordModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const step1 = document.getElementById('resetStep1');
  const step2 = document.getElementById('resetStep2');
  const verifyBtn = document.getElementById('verifyIdentityBtn');
  const resetBtn = document.getElementById('resetPasswordBtn');
  const verifyError = document.getElementById('verifyError');
  const resetError = document.getElementById('resetPasswordError');
  const successToast = document.getElementById('successToast');
  const toastMessage = document.getElementById('toastMessage');

  // Verified credentials stored for step 2
  let verifiedCredentials = { school_id: '', email: '' };

  function openModal() {
    if (!modal) return;
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
      modal.classList.remove('opacity-0');
      modal.querySelector('.bg-white, .dark\\:bg-gray-900').parentElement.querySelector('div:first-child')?.classList?.remove('scale-95');
      const inner = modal.querySelector('.transform');
      if (inner) inner.classList.remove('scale-95');
    });
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.add('opacity-0');
    const inner = modal.querySelector('.transform');
    if (inner) inner.classList.add('scale-95');
    setTimeout(() => {
      modal.classList.add('hidden');
      // Reset to step 1
      step1.classList.remove('hidden', 'opacity-0');
      step2.classList.add('hidden', 'opacity-0');
      // Clear fields
      document.getElementById('resetSchoolId').value = '';
      document.getElementById('resetEmail').value = '';
      const newPw = document.getElementById('newPassword');
      const confirmPw = document.getElementById('confirmNewPassword');
      if (newPw) newPw.value = '';
      if (confirmPw) confirmPw.value = '';
      if (verifyError) { verifyError.classList.add('hidden'); verifyError.textContent = ''; }
      if (resetError) { resetError.classList.add('hidden'); resetError.textContent = ''; }
      verifiedCredentials = { school_id: '', email: '' };
    }, 300);
  }

  function showToast(msg) {
    if (!successToast) return;
    toastMessage.textContent = msg;
    successToast.classList.remove('translate-x-[120%]');
    setTimeout(() => {
      successToast.classList.add('translate-x-[120%]');
    }, 4000);
  }

  if (forgotBtn) forgotBtn.addEventListener('click', openModal);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  // Step 1: Verify Identity
  if (verifyBtn) {
    verifyBtn.addEventListener('click', async () => {
      const school_id = document.getElementById('resetSchoolId').value.trim();
      const email = document.getElementById('resetEmail').value.trim();

      if (!school_id || !email) {
        verifyError.textContent = 'Please fill in both fields.';
        verifyError.classList.remove('hidden');
        return;
      }

      verifyBtn.disabled = true;
      verifyBtn.textContent = 'Verifying...';
      verifyError.classList.add('hidden');

      try {
        const res = await fetch(`${API_BASE}/auth/verify-identity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ school_id, email }),
        });
        const data = await res.json();

        if (!res.ok) {
          verifyError.textContent = data.message || 'Verification failed.';
          verifyError.classList.remove('hidden');
          return;
        }

        // Store verified credentials for step 2
        verifiedCredentials = { school_id, email };

        // Smooth transition to step 2
        step1.style.opacity = '0';
        setTimeout(() => {
          step1.classList.add('hidden');
          step2.classList.remove('hidden');
          requestAnimationFrame(() => {
            step2.classList.remove('opacity-0');
            step2.style.opacity = '1';
          });
          // Re-bind password toggles for new fields
          document.querySelectorAll('#resetStep2 .toggle-password').forEach((btn) => {
            btn.removeEventListener('click', () => togglePasswordVisibility(btn));
            btn.addEventListener('click', () => togglePasswordVisibility(btn));
          });
        }, 300);
      } catch (err) {
        console.error('Verify identity error:', err);
        verifyError.textContent = 'Unable to connect to the server.';
        verifyError.classList.remove('hidden');
      } finally {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify Identity';
      }
    });
  }

  // Step 2: Reset Password
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmNewPassword').value;

      if (!newPassword || !confirmPassword) {
        resetError.textContent = 'Please fill in both password fields.';
        resetError.classList.remove('hidden');
        return;
      }
      if (newPassword.length < 8) {
        resetError.textContent = 'Password must be at least 8 characters.';
        resetError.classList.remove('hidden');
        return;
      }
      if (newPassword !== confirmPassword) {
        resetError.textContent = 'Passwords do not match.';
        resetError.classList.remove('hidden');
        return;
      }

      resetBtn.disabled = true;
      resetBtn.textContent = 'Updating...';
      resetError.classList.add('hidden');

      try {
        const res = await fetch(`${API_BASE}/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            school_id: verifiedCredentials.school_id,
            email: verifiedCredentials.email,
            new_password: newPassword,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          resetError.textContent = data.message || 'Password reset failed.';
          resetError.classList.remove('hidden');
          return;
        }

        // Success — close modal and show toast
        closeModal();
        showToast('Password successfully updated. You can now login with your new credentials.');
      } catch (err) {
        console.error('Reset password error:', err);
        resetError.textContent = 'Unable to connect to the server.';
        resetError.classList.remove('hidden');
      } finally {
        resetBtn.disabled = false;
        resetBtn.textContent = 'Update Password';
      }
    });
  }

  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  // ── Login submit ──────────────────────────────────────────
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value.trim();

      if (!email || !password) {
        alert('Please fill in all fields.');
        return;
      }

      // Disable button while loading
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in...';

      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.message || 'Login failed.');
          return;
        }

        // Store token & user info
        localStorage.setItem('gardnerHub_token', data.token);
        localStorage.setItem('gardnerHub_user', JSON.stringify(data.user));

        // Redirect based on role
        switch (data.user.role) {
          case 'admin':
            window.location.href = './pages/admin/panel.html';
            break;
          case 'faculty':
            window.location.href = './pages/forum/hub.html';
            break;
          default:
            window.location.href = './pages/forum/hub.html';
        }
      } catch (err) {
        console.error('Login error:', err);
        alert('Unable to connect to the server. Please try again later.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  // ── Registration submit ───────────────────────────────────
  if (registerForm) {
    const passwordInput = document.getElementById('regPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordError = document.getElementById('passwordError');

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fullName = document.getElementById('fullName').value.trim();
      const userId = document.getElementById('userId').value.trim();
      const department = document.getElementById('department').value;
      const email = document.getElementById('email').value.trim();
      const password = passwordInput.value.trim();
      const confirmPassword = confirmPasswordInput.value.trim();

      // Get the selected role from register.html
      const selectedRole = window.currentRole || 'student';

      // Validation
      if (!fullName || !userId || !department || !email || !password || !confirmPassword) {
        alert('Please fill in all fields.');
        return;
      }

      if (password !== confirmPassword) {
        passwordError.classList.remove('hidden');
        confirmPasswordInput.classList.add('ring-2', 'ring-red-500');
        return;
      } else {
        passwordError.classList.add('hidden');
        confirmPasswordInput.classList.remove('ring-2', 'ring-red-500');
      }

      if (password.length < 8) {
        alert('Password must be at least 8 characters long.');
        return;
      }

      // Disable button while loading
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';

      try {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: fullName,
            school_id: userId,
            role: selectedRole,
            department_course: department,
            email: email,
            password: password,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.message || 'Registration failed.');
          return;
        }

        alert('Account created successfully! You can now sign in.');
        window.location.href = './index.html';
      } catch (err) {
        console.error('Registration error:', err);
        alert('Unable to connect to the server. Please try again later.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });

    // Real-time password match validation
    confirmPasswordInput.addEventListener('input', () => {
      if (passwordInput.value !== confirmPasswordInput.value) {
        passwordError.classList.remove('hidden');
        confirmPasswordInput.classList.add('ring-2', 'ring-red-500');
      } else {
        passwordError.classList.add('hidden');
        confirmPasswordInput.classList.remove('ring-2', 'ring-red-500');
      }
    });
  }
});

// ── LOGOUT HELPER ───────────────────────────────────────────
function logout() {
  localStorage.removeItem('gardnerHub_token');
  localStorage.removeItem('gardnerHub_user');
  window.location.href = '../index.html';
}

// ── CHECK AUTH (for future dashboard pages) ────────────────
function checkAuth() {
  const user = localStorage.getItem('gardnerHub_user');
  if (!user) {
    window.location.href = '../index.html';
  }
  return JSON.parse(user);
}

// ── HELPER: Get role display label ─────────────────────────
function getRoleLabel(role) {
  switch (role) {
    case 'admin': return 'Administrator';
    case 'faculty': return 'Faculty/Staff';
    case 'student': return 'Student';
    default: return role;
  }
}

// ── HELPER: Get profile page URL based on role ─────────────
function getProfileUrl(role, fromRoot) {
  const prefix = fromRoot ? './pages/' : '../';
  switch (role) {
    case 'admin': return prefix + 'admin/panel.html';
    case 'faculty': return prefix + 'faculty/profile.html';
    default: return prefix + 'student/profile.html';
  }
}
