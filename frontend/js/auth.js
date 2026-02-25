/**
 * ============================================================
 * AUTH.JS — The Gardner Hub Authentication Logic
 * Vanilla JavaScript — Login & Registration handlers
 * ============================================================
 */

const API_BASE = 'http://localhost:5000/api';

// ── THEME MANAGEMENT ────────────────────────────────────────
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  if (isDark) {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  } else {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }
}

// ── LOGIN FORM HANDLER ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initializeTheme();

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
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
            window.location.href = './pages/admin/dashboard.html';
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
  localStorage.removeItem('gardnerHub_user');
  localStorage.removeItem('gardnerHub_token');
  // Legacy keys cleanup
  localStorage.removeItem('userRole');
  localStorage.removeItem('userName');
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
    case 'admin': return prefix + 'admin/profile.html';
    case 'faculty': return prefix + 'faculty/profile.html';
    default: return prefix + 'student/profile.html';
  }
}
