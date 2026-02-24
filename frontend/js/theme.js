/**
 * ============================================================
 * THEME.JS — The Gardner Hub Theme Management
 * Vanilla JavaScript — Light/Dark mode toggle functionality
 * Persists across all pages via localStorage
 * ============================================================
 */

// ── APPLY THEME IMMEDIATELY (prevent flash of wrong theme) ──
(function () {
  const saved = localStorage.getItem('theme') || 'light';
  if (saved === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
})();

// ── THEME MANAGEMENT ────────────────────────────────────────
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

// Attach click handler once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
});