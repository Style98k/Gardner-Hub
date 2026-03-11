/**
 * ============================================================
 * THEME.JS — The Gardner Hub Theme Management
 * Vanilla JavaScript — Light/Dark mode toggle functionality
 * Persists across all pages via localStorage
 * Must be loaded in <head> to prevent flash of wrong theme
 * ============================================================
 */

// ── APPLY THEME IMMEDIATELY (runs before page renders) ──────
function applyTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  if (saved === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

// Apply immediately on script load (before DOM is ready)
applyTheme();

// ── THEME TOGGLE ────────────────────────────────────────────
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