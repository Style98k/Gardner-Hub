/**
 * ============================================================
 * THEME.JS — The Gardner Hub Theme Management
 * Vanilla JavaScript — Light/Dark mode toggle functionality
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

// Initialize theme when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize theme on page load
  initializeTheme();
  
  // Theme toggle button
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
});