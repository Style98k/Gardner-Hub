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
  localStorage.removeItem('gardnerHub_token');
  localStorage.removeItem('gardnerHub_user');
  localStorage.removeItem('token');
  localStorage.removeItem('full_name');
  localStorage.removeItem('role');
  localStorage.removeItem('department');
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
      // Update only the 4 essential stat cards
      document.getElementById('statTotalUsers').textContent = data.totalUsers || 0;
      document.getElementById('statStudents').textContent = data.totalStudents || 0;
      document.getElementById('statFaculty').textContent = data.totalFaculty || 0;
      document.getElementById('statThreads').textContent = data.totalThreads || 0;
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
        '<tr><td colspan="5" class="px-5 py-12 text-center text-slate-400 dark:text-gray-600 italic text-sm">Unable to load users.</td></tr>';
    });
}

function renderUsers(users) {
  var tbody = document.getElementById('usersTableBody');
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="px-5 py-12 text-center text-slate-400 dark:text-gray-600 italic text-sm">No users found.</td></tr>';
    return;
  }

  var roleBadge = {
    admin:   'bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300',
    faculty: 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
    student: 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
  };

  tbody.innerHTML = users.map(function (u) {
    var badge = roleBadge[u.role] || roleBadge.student;
    var joined = u.created_at ? new Date(u.created_at).toLocaleDateString() : '—';
    var isAdmin = u.role === 'admin';
    var initial = (u.full_name || 'U').charAt(0).toUpperCase();

    // Avatar colors based on role
    var avatarBg = {
      admin: 'bg-slate-600',
      faculty: 'bg-emerald-600',
      student: 'bg-blue-600',
    };
    var bg = avatarBg[u.role] || avatarBg.student;

    // Suspend/Reactivate button config based on current status
    var isSuspended = u.status === 'pending';
    var suspendBtnClass = isSuspended
      ? 'p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-all'
      : 'p-1.5 rounded-lg bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/20 text-orange-500 dark:text-orange-400 transition-all';
    var suspendBtnTitle = isSuspended ? 'Reactivate user' : 'Suspend user';
    var suspendBtnIcon = isSuspended
      ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
      : '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>';

    // Action buttons — disabled for admin accounts
    var actions = isAdmin
      ? '<span class="text-[11px] text-slate-400 dark:text-gray-600 italic">Protected</span>'
      : '<div class="flex items-center justify-end gap-1">' +
          '<button onclick="toggleUserStatus(' + u.id + ', \'' + u.status + '\')" ' +
            'class="' + suspendBtnClass + '" title="' + suspendBtnTitle + '">' +
            suspendBtnIcon +
          '</button>' +
          '<button onclick="deleteUser(' + u.id + ', \'' + escapeHtml(u.full_name).replace(/'/g, "\\'") + '\')" ' +
            'class="p-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500 dark:text-red-400 transition-all" title="Delete user">' +
            '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
              '<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>' +
            '</svg>' +
          '</button>' +
          '<button onclick="resetPassword(' + u.id + ', \'' + escapeHtml(u.full_name).replace(/'/g, "\\'") + '\')" ' +
            'class="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 transition-all" title="Reset password">' +
            '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
              '<path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>' +
            '</svg>' +
          '</button>' +
        '</div>';

    return '<tr class="hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-colors">' +
      '<td class="px-5 py-3">' +
        '<div class="flex items-center gap-3">' +
          '<div class="w-9 h-9 rounded-lg ' + bg + ' flex items-center justify-center flex-shrink-0">' +
            '<span class="text-white font-medium text-sm">' + initial + '</span>' +
          '</div>' +
          '<div class="min-w-0">' +
            '<p class="font-medium text-slate-900 dark:text-white truncate text-sm">' + escapeHtml(u.full_name) + '</p>' +
            '<p class="text-[11px] text-slate-500 dark:text-gray-400 truncate">' + escapeHtml(u.email) + '</p>' +
          '</div>' +
        '</div>' +
      '</td>' +
      '<td class="px-5 py-3"><span class="px-2 py-1 rounded-md text-[11px] font-medium ' + badge + '">' + u.role + '</span></td>' +
      '<td class="px-5 py-3 text-slate-500 dark:text-gray-500 font-mono text-xs hidden md:table-cell">' + escapeHtml(u.school_id || '—') + '</td>' +
      '<td class="px-5 py-3 text-slate-500 dark:text-gray-500 text-xs hidden lg:table-cell">' + joined + '</td>' +
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

// ── Toggle User Status (Suspend / Reactivate) ───────────────────────────────

function toggleUserStatus(id, currentStatus) {
  var isSuspended = currentStatus === 'pending';
  var actionLabel = isSuspended ? 'reactivate' : 'suspend';
  var confirmMsg = isSuspended
    ? 'Reactivate this user? They will regain full access to the platform.'
    : 'Suspend this user? They will be immediately blocked from logging in or using the platform.';

  if (!confirm(confirmMsg)) return;

  fetch(API_BASE + '/admin/users/' + id + '/status', {
    method: 'PATCH',
    headers: authHeaders(),
  })
    .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, data: d }; }); })
    .then(function (result) {
      if (!result.ok) {
        alert(result.data.message || 'Failed to ' + actionLabel + ' user.');
        return;
      }
      // Refresh the user table to reflect the new status
      loadUsers();
      loadAuditLogs();
    })
    .catch(function () {
      alert('Network error. Could not ' + actionLabel + ' user.');
    });
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

var activityFeedClickListenerAdded = false;
var allAuditLogs = []; // Store all logs for filtering
var activityLogsTableClickListenerAdded = false;

function loadAuditLogs() {
  fetch(API_BASE + '/admin/audit-logs', { headers: authHeaders() })
    .then(function (res) {
      if (!res.ok) throw new Error('Audit logs fetch failed');
      return res.json();
    })
    .then(function (data) {
      allAuditLogs = data.logs || [];
      // Render both the table view (for Activity Logs section)
      renderAuditLogsTable(allAuditLogs);
    })
    .catch(function (err) {
      console.error('Failed to load audit logs:', err);
      var tableBody = document.getElementById('activityLogsTableBody');
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="5" class="px-5 py-12 text-center text-slate-400 dark:text-gray-600 italic text-sm">Unable to load activity logs.</td></tr>';
      }
    });
}

// Load audit logs specifically for the table view
function loadAuditLogsTable() {
  fetch(API_BASE + '/admin/audit-logs', { headers: authHeaders() })
    .then(function (res) {
      if (!res.ok) throw new Error('Audit logs fetch failed');
      return res.json();
    })
    .then(function (data) {
      allAuditLogs = data.logs || [];
      renderAuditLogsTable(allAuditLogs);
    })
    .catch(function (err) {
      console.error('Failed to load audit logs:', err);
      var tableBody = document.getElementById('activityLogsTableBody');
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="5" class="px-5 py-12 text-center text-slate-400 dark:text-gray-600 italic text-sm">Unable to load activity logs.</td></tr>';
      }
    });
}

// Filter activity logs by type
function filterActivityLogs() {
  var filterEl = document.getElementById('activityTypeFilter');
  if (!filterEl) return;
  
  var filterType = filterEl.value;
  var filteredLogs = filterType === 'all' 
    ? allAuditLogs 
    : allAuditLogs.filter(function(log) { return log.type === filterType; });
  
  renderAuditLogsTable(filteredLogs);
}

// Render activity logs as a professional table
function renderAuditLogsTable(logs) {
  var tableBody = document.getElementById('activityLogsTableBody');
  if (!tableBody) return;

  if (!logs || !logs.length) {
    tableBody.innerHTML = '<tr><td colspan="5" class="px-5 py-12 text-center text-slate-400 dark:text-gray-600 italic text-sm">No activity logs found.</td></tr>';
    return;
  }

  // Badge configuration for activity types
  var typeBadgeConfig = {
    signup: { 
      label: 'Signup', 
      bg: 'bg-emerald-100 dark:bg-emerald-500/20', 
      text: 'text-emerald-700 dark:text-emerald-400',
      icon: '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>'
    },
    thread: { 
      label: 'Thread', 
      bg: 'bg-blue-100 dark:bg-blue-500/20', 
      text: 'text-blue-700 dark:text-blue-400',
      icon: '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>'
    },
    inquiry: { 
      label: 'Inquiry', 
      bg: 'bg-violet-100 dark:bg-violet-500/20', 
      text: 'text-violet-700 dark:text-violet-400',
      icon: '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    },
    MODERATION: { 
      label: 'Moderation', 
      bg: 'bg-orange-100 dark:bg-orange-500/20', 
      text: 'text-orange-700 dark:text-orange-400',
      icon: '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>'
    },
    password_reset: { 
      label: 'Password Reset', 
      bg: 'bg-amber-100 dark:bg-amber-500/20', 
      text: 'text-amber-700 dark:text-amber-400',
      icon: '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>'
    }
  };

  tableBody.innerHTML = logs.map(function(log) {
    var cfg = typeBadgeConfig[log.type] || { label: log.type, bg: 'bg-slate-100 dark:bg-gray-700', text: 'text-slate-700 dark:text-gray-300', icon: '' };
    
    // Format time
    var logDate = new Date(log.created_at);
    var timeStr = logDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    var dateStr = logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    var fullTime = dateStr + ', ' + timeStr;
    
    // Extract user name from label or meta
    var userName = '—';
    var details = '—';
    var userNameClickable = false;
    
    switch (log.type) {
      case 'signup':
        userName = escapeHtml(log.label || 'Unknown');
        details = '<span class="inline-flex items-center gap-1.5"><span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>New user registration</span>';
        userNameClickable = log.user_id ? true : false;
        break;
      case 'thread':
        userName = 'Thread Author';
        details = 'Posted in <span class="font-medium text-blue-600 dark:text-blue-400">' + escapeHtml(log.meta || 'academic') + '</span>';
        break;
      case 'inquiry':
        userName = escapeHtml(log.meta || 'Unknown');
        details = 'Submitted inquiry';
        break;
      case 'MODERATION':
        userName = escapeHtml(log.label || 'System');
        details = '<span class="text-orange-600 dark:text-orange-400">Content flagged</span>';
        break;
      case 'password_reset':
        userName = escapeHtml(log.label || 'Admin');
        details = 'Password was reset';
        break;
      default:
        userName = escapeHtml(log.label || '—');
        details = escapeHtml(log.meta || '—');
    }
    
    // Create clickable username for signup logs
    var userNameHtml = userNameClickable 
      ? '<button onclick="viewRegistrantDetails(' + log.user_id + ')" class="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium hover:underline transition-colors cursor-pointer">' + userName + '</button>'
      : '<span class="text-sm text-slate-700 dark:text-gray-300">' + userName + '</span>';
    
    // Determine if clickable
    var isClickable = log.type === 'thread' || log.type === 'MODERATION' || log.type === 'signup';
    var dataAttrs = '';
    var actionBtn = '<span class="text-[11px] text-slate-400 dark:text-gray-600 italic">—</span>';
    
    if (isClickable) {
      if (log.type === 'thread') {
        dataAttrs = ' data-log-type="thread" data-log-id="' + log.id + '" data-log-meta="' + escapeHtml(log.meta || 'academic') + '"';
        actionBtn = '<button class="activity-table-review-btn px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm">Review</button>';
      } else if (log.type === 'MODERATION') {
        var metaBase64 = btoa(unescape(encodeURIComponent(log.meta || '')));
        dataAttrs = ' data-log-type="MODERATION" data-log-label="' + escapeHtml(log.label) + '" data-log-meta-b64="' + metaBase64 + '"';
        actionBtn = '<button class="activity-table-review-btn px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 transition-all shadow-sm">Review</button>';
      } else if (log.type === 'signup' && log.user_id) {
        dataAttrs = ' data-log-type="signup" data-user-id="' + log.user_id + '"';
        actionBtn = '<button class="activity-table-view-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-sm">' +
          '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>' +
          '</svg>' +
          '<span>View</span>' +
        '</button>';
      }
    }
    
    return '<tr class="activity-log-table-row hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-colors"' + dataAttrs + '>' +
      '<td class="px-5 py-3">' +
        '<div class="flex flex-col">' +
          '<span class="text-sm font-medium text-slate-900 dark:text-white">' + timeStr + '</span>' +
          '<span class="text-[11px] text-slate-400 dark:text-gray-500">' + dateStr + '</span>' +
        '</div>' +
      '</td>' +
      '<td class="px-5 py-3">' +
        userNameHtml +
      '</td>' +
      '<td class="px-5 py-3">' +
        '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ' + cfg.bg + ' ' + cfg.text + '">' +
          cfg.icon +
          cfg.label +
        '</span>' +
      '</td>' +
      '<td class="px-5 py-3 hidden md:table-cell">' +
        '<span class="text-sm text-slate-600 dark:text-gray-400">' + details + '</span>' +
      '</td>' +
      '<td class="px-5 py-3 text-right">' + actionBtn + '</td>' +
    '</tr>';
  }).join('');
  
  // Attach click handler only once via event delegation
  if (!activityLogsTableClickListenerAdded) {
    tableBody.addEventListener('click', handleActivityTableClick);
    activityLogsTableClickListenerAdded = true;
  }
}

// Handle clicks on activity logs table rows
function handleActivityTableClick(e) {
  // Check for review button
  var btn = e.target.closest('.activity-table-review-btn');
  
  // Check for view details button (signup)
  var viewBtn = e.target.closest('.activity-table-view-btn');
  
  if (viewBtn) {
    var row = viewBtn.closest('.activity-log-table-row');
    if (row && row.getAttribute('data-log-type') === 'signup') {
      var userId = row.getAttribute('data-user-id');
      if (userId) {
        viewRegistrantDetails(parseInt(userId));
      }
    }
    return;
  }
  
  if (!btn) return;
  
  var row = btn.closest('.activity-log-table-row');
  if (!row) return;
  
  var logType = row.getAttribute('data-log-type');
  if (!logType) return;
  
  if (logType === 'thread') {
    var postId = row.getAttribute('data-log-id');
    var category = row.getAttribute('data-log-meta') || 'academic';
    openReviewModal(parseInt(postId), category);
  } else if (logType === 'MODERATION') {
    var label = row.getAttribute('data-log-label');
    var metaBase64 = row.getAttribute('data-log-meta-b64');
    var meta = '';
    try {
      meta = decodeURIComponent(escape(atob(metaBase64)));
    } catch (err) {
      meta = '';
    }
    openModerationDetail(label, meta);
  }
}

// ── Activity Log Click Handler ───────────────────────────────────────────────
function handleActivityLogClick(e) {
  var item = e.target.closest('.activity-log-item');
  if (!item) return;
  
  var logType = item.getAttribute('data-log-type');
  if (!logType) return;
  
  if (logType === 'thread') {
    var postId = item.getAttribute('data-log-id');
    var category = item.getAttribute('data-log-meta') || 'academic';
    openReviewModal(parseInt(postId), category);
  } else if (logType === 'MODERATION') {
    var label = item.getAttribute('data-log-label');
    var metaBase64 = item.getAttribute('data-log-meta-b64');
    var meta = '';
    try {
      meta = decodeURIComponent(escape(atob(metaBase64)));
    } catch (err) {
      meta = '';
    }
    openModerationDetail(label, meta);
  }
}

// ── Review Modal Functions ───────────────────────────────────────────────────

var currentReviewPostId = null;
var currentReviewCategory = null;

function openReviewModal(postId, category) {
  currentReviewPostId = postId;
  currentReviewCategory = category;
  
  var modal = document.getElementById('reviewModal');
  var content = document.getElementById('reviewModalContent');
  
  // Show loading state
  content.innerHTML = '<div class="flex items-center justify-center py-12"><svg class="w-6 h-6 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>';
  
  // Show modal
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';
  
  // Fetch post details
  var endpoint = category === 'announcements' 
    ? API_BASE + '/posts/announcements/' + postId
    : API_BASE + '/forum/threads/' + postId;
  
  fetch(endpoint, { headers: authHeaders() })
    .then(function(res) {
      if (!res.ok) throw new Error('Post not found');
      return res.json();
    })
    .then(function(data) {
      var post = data.announcement || data.thread;
      if (!post) throw new Error('Post data missing');
      renderReviewContent(post, category);
    })
    .catch(function(err) {
      content.innerHTML = '<div class="text-center py-12"><svg class="w-10 h-10 text-slate-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg><p class="text-slate-500 dark:text-gray-400 text-sm">Unable to load post content.</p><p class="text-slate-400 dark:text-gray-500 text-xs mt-1">The post may have been deleted.</p></div>';
    });
}

function renderReviewContent(post, category) {
  var content = document.getElementById('reviewModalContent');
  
  var categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
  if (category === 'academic') categoryLabel = 'Academic Discussion';
  if (category === 'announcements') categoryLabel = 'Official Announcements';
  
  var roleBadgeClass = {
    admin: 'bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300',
    faculty: 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
    student: 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
  };
  var badge = roleBadgeClass[post.author_role] || roleBadgeClass.student;
  
  // Build image HTML if present
  var imageHtml = '';
  if (post.image_url) {
    var imgPath = category === 'announcements' 
      ? API_BASE.replace('/api', '') + '/uploads/announcements/' + post.image_url
      : API_BASE.replace('/api', '') + '/uploads/academic/' + post.image_url;
    imageHtml = '<div class="mt-4 rounded-lg overflow-hidden border border-slate-200 dark:border-gray-700"><img src="' + imgPath + '" alt="Post image" class="w-full max-h-64 object-cover" onerror="this.parentElement.style.display=\'none\'"></div>';
  }
  
  // Format date
  var postDate = new Date(post.created_at).toLocaleDateString('en-US', { 
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
  
  content.innerHTML = 
    '<div class="space-y-4">' +
      '<!-- Author Info -->' +
      '<div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-gray-800">' +
        '<div class="w-10 h-10 rounded-lg bg-slate-600 flex items-center justify-center">' +
          '<span class="text-white font-semibold">' + (post.author_name || 'U').charAt(0).toUpperCase() + '</span>' +
        '</div>' +
        '<div class="flex-1 min-w-0">' +
          '<p class="font-medium text-slate-900 dark:text-white truncate">' + escapeHtml(post.author_name || 'Unknown User') + '</p>' +
          '<div class="flex items-center gap-2 mt-0.5">' +
            '<span class="px-2 py-0.5 rounded text-[10px] font-medium ' + badge + '">' + (post.author_role || 'student') + '</span>' +
            '<span class="text-[11px] text-slate-400 dark:text-gray-500">' + postDate + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<!-- Category Badge -->' +
      '<div class="flex items-center gap-2">' +
        '<span class="px-2.5 py-1 rounded-lg text-xs font-medium bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400">' + categoryLabel + '</span>' +
        (post.tag ? '<span class="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">' + escapeHtml(post.tag) + '</span>' : '') +
      '</div>' +
      '<!-- Title -->' +
      (post.title ? '<h4 class="text-lg font-semibold text-slate-900 dark:text-white">' + escapeHtml(post.title) + '</h4>' : '') +
      '<!-- Content -->' +
      '<div class="bg-slate-50 dark:bg-gray-800/50 rounded-lg p-4 max-h-48 overflow-y-auto custom-scroll">' +
        '<p class="text-sm text-slate-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">' + escapeHtml(post.content) + '</p>' +
      '</div>' +
      imageHtml +
    '</div>';
}

function closeReviewModal() {
  var modal = document.getElementById('reviewModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.body.style.overflow = '';
  currentReviewPostId = null;
  currentReviewCategory = null;
}

function deleteReviewedPost() {
  if (!currentReviewPostId || !currentReviewCategory) return;
  
  if (!confirm('Are you sure you want to permanently delete this post?\n\nThis action cannot be undone.')) {
    return;
  }
  
  var endpoint = currentReviewCategory === 'announcements' 
    ? API_BASE + '/posts/announcements/' + currentReviewPostId
    : API_BASE + '/forum/threads/' + currentReviewPostId;
  
  fetch(endpoint, {
    method: 'DELETE',
    headers: authHeaders(),
  })
    .then(function(res) { return res.json().then(function(d) { return { ok: res.ok, data: d }; }); })
    .then(function(result) {
      if (!result.ok) {
        alert(result.data.message || 'Failed to delete post.');
        return;
      }
      alert('Post deleted successfully.');
      closeReviewModal();
      // Refresh stats and activity feed
      loadStats();
      loadAuditLogs();
    })
    .catch(function() {
      alert('Network error. Could not delete post.');
    });
}

function openModerationDetail(label, meta) {
  // Try to parse meta as JSON (new format), fallback to old format
  var modData;
  try {
    modData = JSON.parse(meta);
  } catch (e) {
    // Old format: "UserName | Category"
    var parts = meta.split(' | ');
    alert('Moderation Event\n\n' +
      'Type: ' + label + '\n' +
      'User: ' + (parts[0] || 'Unknown') + '\n' +
      'Category: ' + (parts[1] || 'Unknown') + '\n\n' +
      'This is a legacy log entry. Newer entries will have full review capability.');
    return;
  }
  
  // Open the moderation modal with the parsed data
  openModerationModal(modData);
}

// ── Moderation Modal State ───────────────────────────────────────────────────
var currentModerationData = null;

function openModerationModal(modData) {
  currentModerationData = modData;
  
  var modal = document.getElementById('moderationModal');
  var content = document.getElementById('moderationModalContent');
  
  if (!modal || !content) {
    console.error('Moderation modal elements not found');
    return;
  }
  
  // Format category label
  var categoryLabel = modData.category || 'Unknown';
  if (categoryLabel === 'academic') categoryLabel = 'Academic Discussion';
  if (categoryLabel === 'announcements') categoryLabel = 'Official Announcements';
  categoryLabel = categoryLabel.charAt(0).toUpperCase() + categoryLabel.slice(1);
  
  // Format type label
  var typeLabel = modData.type || 'content';
  if (typeLabel === 'thread') typeLabel = 'Thread';
  if (typeLabel === 'comment') typeLabel = 'Comment';
  if (typeLabel === 'reply') typeLabel = 'Reply';
  
  // Build content preview
  var contentPreview = modData.content || 'Content preview not available';
  if (contentPreview.length > 150) {
    contentPreview = contentPreview.substring(0, 147) + '...';
  }
  
  // Determine if we can open thread
  var threadId = modData.threadId || modData.id;
  var canOpenThread = threadId && (modData.category === 'academic' || modData.category === 'announcements');
  
  // Build the modal content
  content.innerHTML = 
    '<div class="space-y-5">' +
      '<!-- Warning Banner -->' +
      '<div class="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">' +
        '<div class="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">' +
          '<svg class="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>' +
          '</svg>' +
        '</div>' +
        '<div class="flex-1">' +
          '<h4 class="font-semibold text-amber-800 dark:text-amber-300">Profanity Detected</h4>' +
          '<p class="text-sm text-amber-700 dark:text-amber-400/80 mt-0.5">This content was automatically filtered for inappropriate language.</p>' +
        '</div>' +
      '</div>' +
      
      '<!-- Author Info -->' +
      '<div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-gray-800">' +
        '<div class="w-11 h-11 rounded-xl bg-slate-600 flex items-center justify-center">' +
          '<span class="text-white font-semibold text-lg">' + (modData.author || 'U').charAt(0).toUpperCase() + '</span>' +
        '</div>' +
        '<div class="flex-1 min-w-0">' +
          '<p class="font-semibold text-slate-900 dark:text-white">' + escapeHtml(modData.author || 'Unknown User') + '</p>' +
          '<div class="flex items-center gap-2 mt-1">' +
            '<span class="px-2 py-0.5 rounded-md text-[10px] font-medium bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400">' + categoryLabel + '</span>' +
            '<span class="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-400">' + typeLabel + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      
      '<!-- Content Preview -->' +
      '<div>' +
        '<label class="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">Filtered Content</label>' +
        '<div class="mt-2 bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 border border-slate-200 dark:border-gray-700">' +
          '<p class="text-sm text-slate-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">' + escapeHtml(contentPreview) + '</p>' +
        '</div>' +
        '<p class="text-[11px] text-slate-400 dark:text-gray-500 mt-2 italic">Note: Profanity has been masked with asterisks (*)</p>' +
      '</div>' +
      
      '<!-- Action Buttons -->' +
      '<div class="flex flex-col sm:flex-row gap-3 pt-2">' +
        (canOpenThread ? 
          '<button onclick="openThreadFromModeration()" class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-gray-200 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-gray-700">' +
            '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
              '<path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>' +
            '</svg>' +
            'Open Thread' +
          '</button>' 
        : '') +
        '<button onclick="deleteModerationContent()" class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20">' +
          '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>' +
          '</svg>' +
          'Delete Content' +
        '</button>' +
      '</div>' +
    '</div>';
  
  // Show modal
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

function closeModerationModal() {
  var modal = document.getElementById('moderationModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  document.body.style.overflow = '';
  currentModerationData = null;
}

function openThreadFromModeration() {
  if (!currentModerationData) return;
  
  var threadId = currentModerationData.threadId || currentModerationData.id;
  var category = currentModerationData.category;
  
  if (!threadId) {
    alert('Unable to open thread: Thread ID not available');
    return;
  }
  
  // Determine the URL based on category
  var url;
  if (category === 'announcements') {
    url = '../forum/announcements.html?highlight=' + threadId;
  } else {
    url = '../forum/thread.html?id=' + threadId;
  }
  
  // Open in new tab
  window.open(url, '_blank');
}

function deleteModerationContent() {
  if (!currentModerationData) return;
  
  var typeLabel = currentModerationData.type === 'thread' ? 'thread' : 'content';
  var confirmMessage = 'Are you sure you want to permanently delete this ' + typeLabel + '?\n\nThis action cannot be undone.';
  
  // For replies, we need to delete the entire thread since there's no individual reply delete endpoint
  if (currentModerationData.type === 'reply') {
    confirmMessage = 'To delete this reply, the entire thread will be deleted.\n\nAre you sure you want to proceed?';
  }
  
  if (!confirm(confirmMessage)) {
    return;
  }
  
  var endpoint;
  var contentId = currentModerationData.id;
  var threadId = currentModerationData.threadId;
  var category = currentModerationData.category;
  var contentType = currentModerationData.type;
  
  // Determine the correct endpoint based on type and category
  if (contentType === 'thread') {
    if (category === 'announcements') {
      endpoint = API_BASE + '/posts/announcements/' + contentId;
    } else {
      endpoint = API_BASE + '/forum/threads/' + contentId;
    }
  } else if (contentType === 'comment') {
    if (category === 'announcements') {
      endpoint = API_BASE + '/posts/comments/' + contentId;
    } else {
      endpoint = API_BASE + '/forum/comments/' + contentId;
    }
  } else if (contentType === 'reply') {
    // For replies, delete the parent thread since there's no individual reply delete
    if (threadId) {
      endpoint = API_BASE + '/forum/threads/' + threadId;
    } else {
      alert('Cannot delete reply: Thread ID not available. Please delete from the thread page.');
      return;
    }
  } else {
    alert('Unknown content type. Cannot delete.');
    return;
  }
  
  fetch(endpoint, {
    method: 'DELETE',
    headers: authHeaders(),
  })
    .then(function(res) { 
      return res.json().then(function(d) { return { ok: res.ok, data: d }; }); 
    })
    .then(function(result) {
      if (!result.ok) {
        alert(result.data.message || 'Failed to delete content.');
        return;
      }
      alert('Content deleted successfully.');
      closeModerationModal();
      // Refresh stats and activity feed
      loadStats();
      loadAuditLogs();
    })
    .catch(function() {
      alert('Network error. Could not delete content.');
    });
}

// ── Registrant Details Modal Functions ───────────────────────────────────────

function viewRegistrantDetails(userId) {
  if (!userId) {
    console.error('No user ID provided');
    return;
  }
  
  var modal = document.getElementById('registrantDetailsModal');
  var content = document.getElementById('registrantModalContent');
  
  if (!modal || !content) {
    console.error('Registrant modal elements not found');
    return;
  }
  
  // Show loading state
  content.innerHTML = '<div class="flex items-center justify-center py-12"><svg class="w-6 h-6 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>';
  
  // Show modal
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';
  
  // Fetch user details using the profile endpoint
  fetch(API_BASE + '/auth/profile/' + userId, { headers: authHeaders() })
    .then(function(res) {
      if (!res.ok) throw new Error('User not found');
      return res.json();
    })
    .then(function(data) {
      var user = data.user;
      if (!user) throw new Error('User data missing');
      renderRegistrantDetails(user);
    })
    .catch(function(err) {
      console.error('Failed to fetch user details:', err);
      content.innerHTML = '<div class="text-center py-12"><svg class="w-10 h-10 text-slate-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg><p class="text-slate-500 dark:text-gray-400 text-sm">Unable to load user details.</p><p class="text-slate-400 dark:text-gray-500 text-xs mt-1">The user may have been deleted.</p></div>';
    });
}

function renderRegistrantDetails(user) {
  var content = document.getElementById('registrantModalContent');
  if (!content) return;
  
  // Format role badge
  var roleBadgeConfig = {
    student: { bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-400', label: 'Student' },
    faculty: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400', label: 'Faculty' },
    admin: { bg: 'bg-slate-100 dark:bg-gray-700', text: 'text-slate-700 dark:text-gray-300', label: 'Administrator' }
  };
  var roleCfg = roleBadgeConfig[user.role] || roleBadgeConfig.student;
  
  // Format registration date
  var regDate = new Date(user.created_at);
  var formattedDate = regDate.toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric'
  });
  var formattedTime = regDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Build profile photo or initial avatar
  var avatarHtml;
  if (user.profile_photo) {
    var photoUrl = API_BASE.replace('/api', '') + '/uploads/profile_photos/' + user.profile_photo;
    avatarHtml = '<img src="' + photoUrl + '" alt="Profile" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML=\'<span class=\\\'text-white font-bold text-2xl\\\'>' + (user.full_name || 'U').charAt(0).toUpperCase() + '</span>\'">';
  } else {
    avatarHtml = '<span class="text-white font-bold text-2xl">' + (user.full_name || 'U').charAt(0).toUpperCase() + '</span>';
  }
  
  content.innerHTML = 
    '<div class="space-y-5">' +
      '<!-- User Avatar & Name Header -->' +
      '<div class="flex items-center gap-4 pb-5 border-b border-slate-100 dark:border-gray-800">' +
        '<div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 overflow-hidden">' +
          avatarHtml +
        '</div>' +
        '<div class="flex-1 min-w-0">' +
          '<h4 class="text-lg font-bold text-slate-900 dark:text-white truncate">' + escapeHtml(user.full_name || 'Unknown User') + '</h4>' +
          '<div class="flex items-center gap-2 mt-1.5">' +
            '<span class="px-2.5 py-1 rounded-lg text-xs font-semibold ' + roleCfg.bg + ' ' + roleCfg.text + '">' + roleCfg.label + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      
      '<!-- User Details Grid -->' +
      '<div class="grid grid-cols-1 gap-4">' +
        
        '<!-- School/Employee ID -->' +
        '<div class="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-gray-800/50 border border-slate-100 dark:border-gray-700/50">' +
          '<div class="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center flex-shrink-0">' +
            '<svg class="w-4 h-4 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
              '<path stroke-linecap="round" stroke-linejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/>' +
            '</svg>' +
          '</div>' +
          '<div class="flex-1 min-w-0">' +
            '<p class="text-[11px] font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">School/Employee ID</p>' +
            '<p class="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">' + escapeHtml(user.school_id || '—') + '</p>' +
          '</div>' +
        '</div>' +
        
        '<!-- Email -->' +
        '<div class="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-gray-800/50 border border-slate-100 dark:border-gray-700/50">' +
          '<div class="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0">' +
            '<svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
              '<path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>' +
            '</svg>' +
          '</div>' +
          '<div class="flex-1 min-w-0">' +
            '<p class="text-[11px] font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">Email</p>' +
            '<p class="text-sm font-semibold text-slate-900 dark:text-white mt-0.5 truncate">' + escapeHtml(user.email || '—') + '</p>' +
          '</div>' +
        '</div>' +
        
        '<!-- Department/Course -->' +
        '<div class="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-gray-800/50 border border-slate-100 dark:border-gray-700/50">' +
          '<div class="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0">' +
            '<svg class="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
              '<path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>' +
            '</svg>' +
          '</div>' +
          '<div class="flex-1 min-w-0">' +
            '<p class="text-[11px] font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">' + (user.role === 'faculty' ? 'Department' : 'Course/Program') + '</p>' +
            '<p class="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">' + escapeHtml(user.department_course || 'Not specified') + '</p>' +
          '</div>' +
        '</div>' +
        
        '<!-- Registration Date -->' +
        '<div class="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 border border-emerald-200 dark:border-emerald-500/20">' +
          '<div class="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-500/30 flex items-center justify-center flex-shrink-0">' +
            '<svg class="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
              '<path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>' +
            '</svg>' +
          '</div>' +
          '<div class="flex-1 min-w-0">' +
            '<p class="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Registration Date</p>' +
            '<p class="text-sm font-semibold text-emerald-800 dark:text-emerald-200 mt-0.5">' + formattedDate + '</p>' +
            '<p class="text-[11px] text-emerald-600 dark:text-emerald-400">' + formattedTime + '</p>' +
          '</div>' +
        '</div>' +
        
      '</div>' +
      
      '<!-- Security Badge -->' +
      '<div class="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-gray-800">' +
        '<svg class="w-4 h-4 text-slate-400 dark:text-gray-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
          '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>' +
        '</svg>' +
        '<span class="text-[11px] text-slate-400 dark:text-gray-500">User identity verified • Secure profile data</span>' +
      '</div>' +
    '</div>';
}

function closeRegistrantModal() {
  var modal = document.getElementById('registrantDetailsModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  document.body.style.overflow = '';
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
