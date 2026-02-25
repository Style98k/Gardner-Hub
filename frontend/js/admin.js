/**
 * ============================================================
 * ADMIN.JS — The Gardner Hub Admin Command Center Logic
 * Fetches & renders: profile, stats, users, audit logs
 * Handles: delete user, reset password, filtering
 * ============================================================
 */

const API_BASE = 'http://localhost:5000/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCurrentUser() {
  try {
    var raw = localStorage.getItem('gardnerHub_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function getToken() {
  return localStorage.getItem('gardnerHub_token');
}

function authHeaders() {
  return {
    'Authorization': 'Bearer ' + getToken(),
    'Content-Type': 'application/json',
  };
}

function escapeHtml(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function timeAgo(dateStr) {
  var now = Date.now();
  var then = new Date(dateStr).getTime();
  var diff = Math.max(0, now - then);
  var seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  var minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + 'm ago';
  var hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + 'h ago';
  var days = Math.floor(hours / 24);
  if (days < 30) return days + 'd ago';
  var months = Math.floor(days / 30);
  return months + 'mo ago';
}

// ── Logout ───────────────────────────────────────────────────────────────────

function logout() {
  localStorage.removeItem('gardnerHub_user');
  localStorage.removeItem('gardnerHub_token');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userName');
  window.location.href = '../../index.html';
}

// ── Load Admin Profile into Top Bar ──────────────────────────────────────────

function loadAdminProfile() {
  var user = getCurrentUser();
  if (!user) return;

  var nameEl = document.getElementById('topBarName');
  var emailEl = document.getElementById('topBarEmail');
  var initialEl = document.getElementById('topBarInitial');

  if (nameEl) nameEl.textContent = user.full_name || 'Administrator';
  if (emailEl) emailEl.textContent = user.email || '';
  if (initialEl) initialEl.textContent = (user.full_name || 'A').charAt(0).toUpperCase();
}

// ── Load System Stats ────────────────────────────────────────────────────────

function loadStats() {
  fetch(API_BASE + '/admin/stats', { headers: authHeaders() })
    .then(function (res) {
      if (!res.ok) throw new Error('Stats fetch failed');
      return res.json();
    })
    .then(function (data) {
      document.getElementById('statTotalUsers').textContent = data.totalUsers || 0;
      document.getElementById('statStudents').textContent = data.totalStudents || 0;
      document.getElementById('statFaculty').textContent = data.totalFaculty || 0;
      document.getElementById('statThreads').textContent = data.totalThreads || 0;
      document.getElementById('statInquiries').textContent = data.totalInquiries || 0;
      document.getElementById('statPending').textContent = data.pendingInquiriesCount || 0;
    })
    .catch(function (err) {
      console.error('Failed to load stats:', err);
    });
}

// ── User Management ──────────────────────────────────────────────────────────

var allUsers = [];

function loadUsers() {
  fetch(API_BASE + '/auth/users', { headers: authHeaders() })
    .then(function (res) {
      if (!res.ok) throw new Error('Users fetch failed');
      return res.json();
    })
    .then(function (data) {
      allUsers = data.users || [];
      renderUsers(allUsers);
      var countEl = document.getElementById('userCount');
      if (countEl) countEl.textContent = allUsers.length;
    })
    .catch(function (err) {
      console.error('Failed to load users:', err);
      document.getElementById('usersTableBody').innerHTML =
        '<tr><td colspan="6" class="px-5 py-12 text-center text-gray-600 italic text-xs">Unable to load users.</td></tr>';
    });
}

function renderUsers(users) {
  var tbody = document.getElementById('usersTableBody');
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="px-5 py-12 text-center text-gray-600 italic text-xs">No users found.</td></tr>';
    return;
  }

  var roleBadge = {
    admin:   'bg-white/10 text-white',
    faculty: 'bg-emerald-500/15 text-emerald-400',
    student: 'bg-blue-500/15 text-blue-400',
  };

  tbody.innerHTML = users.map(function (u) {
    var badge = roleBadge[u.role] || roleBadge.student;
    var joined = u.created_at ? new Date(u.created_at).toLocaleDateString() : '—';
    var isAdmin = u.role === 'admin';

    // Action buttons — disabled for admin accounts
    var actions = isAdmin
      ? '<span class="text-[10px] text-gray-600 italic">Protected</span>'
      : '<div class="flex items-center justify-end gap-1">' +
          '<button onclick="deleteUser(' + u.id + ', \'' + escapeHtml(u.full_name).replace(/'/g, "\\'") + '\')" ' +
            'class="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors" title="Delete user">' +
            '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
              '<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>' +
            '</svg>' +
          '</button>' +
          '<button onclick="resetPassword(' + u.id + ', \'' + escapeHtml(u.full_name).replace(/'/g, "\\'") + '\')" ' +
            'class="p-1.5 rounded-lg hover:bg-yellow-500/20 text-yellow-400 hover:text-yellow-300 transition-colors" title="Reset password">' +
            '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
              '<path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>' +
            '</svg>' +
          '</button>' +
        '</div>';

    return '<tr class="border-b border-gray-800/60 hover:bg-gray-800/40 transition-colors">' +
      '<td class="px-5 py-3 font-medium text-white">' + escapeHtml(u.full_name) + '</td>' +
      '<td class="px-5 py-3 text-gray-400">' + escapeHtml(u.email) + '</td>' +
      '<td class="px-5 py-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ' + badge + '">' + u.role + '</span></td>' +
      '<td class="px-5 py-3 text-gray-500 font-mono text-[11px]">' + escapeHtml(u.school_id || '—') + '</td>' +
      '<td class="px-5 py-3 text-gray-500">' + joined + '</td>' +
      '<td class="px-5 py-3 text-right">' + actions + '</td>' +
    '</tr>';
  }).join('');
}

function filterUsers() {
  var role = document.getElementById('roleFilter').value;
  var filtered = role === 'all' ? allUsers : allUsers.filter(function (u) { return u.role === role; });
  renderUsers(filtered);
  var countEl = document.getElementById('userCount');
  if (countEl) countEl.textContent = filtered.length;
}

// ── Delete User ──────────────────────────────────────────────────────────────

function deleteUser(id, name) {
  if (!confirm('Delete user "' + name + '"?\n\nThis will permanently remove the user and all their posts, comments, likes, and inquiries. This action cannot be undone.')) {
    return;
  }

  fetch(API_BASE + '/admin/users/' + id, {
    method: 'DELETE',
    headers: authHeaders(),
  })
    .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, data: d }; }); })
    .then(function (result) {
      if (!result.ok) {
        alert(result.data.message || 'Failed to delete user.');
        return;
      }
      alert('User "' + name + '" has been deleted.');
      loadUsers();
      loadStats();
      loadAuditLogs();
    })
    .catch(function () {
      alert('Network error. Could not delete user.');
    });
}

// ── Reset User Password ──────────────────────────────────────────────────────

function resetPassword(id, name) {
  if (!confirm('Reset password for "' + name + '" to the default (password123)?')) {
    return;
  }

  fetch(API_BASE + '/admin/users/' + id + '/reset-password', {
    method: 'POST',
    headers: authHeaders(),
  })
    .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, data: d }; }); })
    .then(function (result) {
      if (!result.ok) {
        alert(result.data.message || 'Failed to reset password.');
        return;
      }
      alert('Password for "' + name + '" has been reset to "password123".');
    })
    .catch(function () {
      alert('Network error. Could not reset password.');
    });
}

// ── Audit Logs / Activity Feed ───────────────────────────────────────────────

function loadAuditLogs() {
  fetch(API_BASE + '/admin/audit-logs', { headers: authHeaders() })
    .then(function (res) {
      if (!res.ok) throw new Error('Audit logs fetch failed');
      return res.json();
    })
    .then(function (data) {
      renderAuditLogs(data.logs || []);
    })
    .catch(function (err) {
      console.error('Failed to load audit logs:', err);
      document.getElementById('activityFeed').innerHTML =
        '<div class="px-5 py-12 text-center text-gray-600 italic text-xs">Unable to load activity.</div>';
    });
}

function renderAuditLogs(logs) {
  var feed = document.getElementById('activityFeed');

  if (!logs.length) {
    feed.innerHTML = '<div class="px-5 py-12 text-center text-gray-600 italic text-xs">No recent activity.</div>';
    return;
  }

  // Badge config per type
  var badgeConfig = {
    signup:  { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Signup',  icon: '&#x1F464;' },
    thread:  { bg: 'bg-blue-500/15',    text: 'text-blue-400',    label: 'Thread',  icon: '&#x1F4AC;' },
    inquiry: { bg: 'bg-purple-500/15',   text: 'text-purple-400',  label: 'Inquiry', icon: '&#x1F4CB;' },
  };

  feed.innerHTML = logs.map(function (log) {
    var cfg = badgeConfig[log.type] || badgeConfig.signup;
    var ago = timeAgo(log.created_at);

    var description = '';
    switch (log.type) {
      case 'signup':
        description = 'New ' + (log.meta || 'user') + ' registered: <span class="text-white font-medium">' + escapeHtml(log.label) + '</span>';
        break;
      case 'thread':
        description = 'New thread in <span class="text-white font-medium">' + escapeHtml(log.meta) + '</span>: ' + escapeHtml(log.label);
        break;
      case 'inquiry':
        description = 'New inquiry <span class="text-white font-medium">' + escapeHtml(log.label) + '</span> by ' + escapeHtml(log.meta);
        break;
      default:
        description = escapeHtml(log.label);
    }

    return '<div class="px-5 py-3 flex items-start gap-3 hover:bg-gray-800/40 transition-colors">' +
      '<div class="mt-0.5 flex-shrink-0">' +
        '<span class="inline-flex items-center justify-center w-7 h-7 rounded-lg ' + cfg.bg + ' text-xs">' + cfg.icon + '</span>' +
      '</div>' +
      '<div class="flex-1 min-w-0">' +
        '<p class="text-xs text-gray-300 leading-relaxed">' + description + '</p>' +
        '<div class="flex items-center gap-2 mt-1">' +
          '<span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ' + cfg.bg + ' ' + cfg.text + '">' + cfg.label + '</span>' +
          '<span class="text-[10px] text-gray-600">' + ago + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
  var user = getCurrentUser();
  if (!user || user.role !== 'admin') {
    window.location.href = '../../index.html';
    return;
  }

  loadAdminProfile();
  loadStats();
  loadUsers();
  loadAuditLogs();
});
