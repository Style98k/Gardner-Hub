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
        '<div class="px-4 py-10 text-center text-slate-400 dark:text-gray-600 italic text-xs">Unable to load activity.</div>';
    });
}

function renderAuditLogs(logs) {
  var feed = document.getElementById('activityFeed');

  if (!logs.length) {
    feed.innerHTML = '<div class="px-4 py-10 text-center text-slate-400 dark:text-gray-600 italic text-xs">No recent activity.</div>';
    return;
  }

  // Compact badge config per type
  var badgeConfig = {
    signup:  { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', icon: '<svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>' },
    thread:  { bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', icon: '<svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>' },
    inquiry: { bg: 'bg-violet-100 dark:bg-violet-500/20', text: 'text-violet-600 dark:text-violet-400', icon: '<svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' },
    MODERATION: { bg: 'bg-orange-100 dark:bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400', icon: '<svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>' },
    password_reset: { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', icon: '<svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>' },
  };

  feed.innerHTML = logs.map(function (log, idx) {
    var cfg = badgeConfig[log.type] || badgeConfig.signup;
    var ago = timeAgo(log.created_at);

    // Determine if this item is clickable (thread or MODERATION types)
    var isClickable = log.type === 'thread' || log.type === 'MODERATION';
    var dataAttrs = '';
    var cursorClass = '';
    
    if (isClickable) {
      if (log.type === 'thread') {
        // For threads, use data attributes
        dataAttrs = ' data-log-type="thread" data-log-id="' + log.id + '" data-log-meta="' + escapeHtml(log.meta || 'academic') + '"';
      } else if (log.type === 'MODERATION') {
        // For moderation logs, store meta as base64 to avoid quote issues with JSON
        var metaBase64 = btoa(unescape(encodeURIComponent(log.meta || '')));
        dataAttrs = ' data-log-type="MODERATION" data-log-label="' + escapeHtml(log.label) + '" data-log-meta-b64="' + metaBase64 + '"';
      }
      cursorClass = ' cursor-pointer';
    }

    // Compact description
    var description = '';
    switch (log.type) {
      case 'signup':
        description = '<span class="font-medium text-slate-800 dark:text-white">' + escapeHtml(log.label) + '</span> joined';
        break;
      case 'thread':
        description = 'Thread in <span class="font-medium">' + escapeHtml(log.meta) + '</span>';
        break;
      case 'inquiry':
        description = 'Inquiry by <span class="font-medium">' + escapeHtml(log.meta) + '</span>';
        break;
      case 'MODERATION':
        description = '<span class="font-medium text-orange-600 dark:text-orange-400">' + escapeHtml(log.label) + '</span>';
        break;
      case 'password_reset':
        description = escapeHtml(log.label);
        break;
      default:
        description = escapeHtml(log.label);
    }

    // Add review indicator for clickable items
    var reviewIndicator = isClickable 
      ? '<svg class="w-3.5 h-3.5 text-slate-300 dark:text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>'
      : '';

    return '<div class="activity-log-item px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-colors border-b border-slate-100 dark:border-gray-800 last:border-b-0' + cursorClass + '"' + dataAttrs + '>' +
      '<div class="w-7 h-7 rounded-lg ' + cfg.bg + ' flex items-center justify-center flex-shrink-0 ' + cfg.text + '">' + cfg.icon + '</div>' +
      '<div class="flex-1 min-w-0">' +
        '<p class="text-xs text-slate-600 dark:text-gray-300 truncate">' + description + '</p>' +
        '<p class="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5">' + ago + '</p>' +
      '</div>' +
      reviewIndicator +
    '</div>';
  }).join('');
  
  // Attach click handler only once via event delegation
  if (!activityFeedClickListenerAdded) {
    feed.addEventListener('click', handleActivityLogClick);
    activityFeedClickListenerAdded = true;
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
