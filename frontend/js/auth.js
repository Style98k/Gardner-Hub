/**
 * ============================================================
 * AUTH.JS — The Gardner Hub Authentication Logic
 * Vanilla JavaScript — Login & Registration handlers
 * ============================================================
 */

// ── THEME MANAGEMENT ────────────────────────────────────────
function initializeTheme() {
  // Check for saved theme or default to light mode
  const savedTheme = localStorage.getItem('theme') || 'light';
  
  // Apply theme to document
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
  // Initialize theme on page load
  initializeTheme();
  
  // Theme toggle button
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  // Login submit
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const schoolId = document.getElementById('schoolId').value.trim();
      const password = document.getElementById('password').value.trim();

      // Dummy validation
      if (!schoolId || !password) {
        alert('Please fill in all fields.');
        return;
      }

      // Simulate authentication (dummy logic)
      console.log('Login attempt:', { schoolId, password });

      // Store session (localStorage for demo purposes)
      const userData = {
        schoolId: schoolId,
        name: 'Sample User',
        role: 'Student', // Could be Admin, Faculty, Student
        loginTime: new Date().toISOString(),
      };
      localStorage.setItem('gardnerHub_user', JSON.stringify(userData));

      // Show success message
      alert(`Welcome back, ${userData.name}!`);

      // Redirect to hub
      window.location.href = './pages/forum/hub.html';
    });
  }

  // Registration submit
  if (registerForm) {
    const passwordInput = document.getElementById('regPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordError = document.getElementById('passwordError');

    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const fullName = document.getElementById('fullName').value.trim();
      const userId = document.getElementById('userId').value.trim();
      const department = document.getElementById('department').value;
      const email = document.getElementById('email').value.trim();
      const password = passwordInput.value.trim();
      const confirmPassword = confirmPasswordInput.value.trim();
      
      // Get the selected role from the global currentRole variable (from register.html)
      const selectedRole = window.currentRole || 'student';
      const roleName = selectedRole === 'student' ? 'Student' : 'Faculty';

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

      // Simulate registration (dummy logic)
      console.log('Registration attempt:', {
        fullName,
        userId,
        department,
        email,
        password,
        role: roleName
      });

      // Store user data (in real app, send to backend)
      const newUser = {
        schoolId: userId,
        name: fullName,
        department: department,
        email: email,
        role: roleName,
        registeredAt: new Date().toISOString(),
      };
      localStorage.setItem('gardnerHub_user', JSON.stringify(newUser));

      // Show success message
      alert(`Account created successfully! Welcome, ${fullName}.`);

      // Redirect to hub
      window.location.href = './pages/forum/hub.html';
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

// ── LOGOUT HELPER (for future use) ─────────────────────────
function logout() {
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
