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

  feed.innerHTML = logs.map(function (log) {
    var cfg = badgeConfig[log.type] || badgeConfig.signup;
    var ago = timeAgo(log.created_at);

    // Determine if this item is clickable (thread or MODERATION types)
    var isClickable = log.type === 'thread' || log.type === 'MODERATION';
    var clickAttr = '';
    var cursorClass = '';
    
    if (isClickable) {
      if (log.type === 'thread') {
        // For threads, use the log.id as postId and log.meta as category
        clickAttr = ' onclick="openReviewModal(' + log.id + ', \'' + escapeHtml(log.meta || 'academic') + '\')"';
      } else if (log.type === 'MODERATION') {
        // For moderation logs, we need to find the post - meta contains "userName | Category"
        // We'll open a search modal or just show the moderation details
        clickAttr = ' onclick="openModerationDetail(\'' + escapeHtml(log.label).replace(/'/g, "\\'") + '\', \'' + escapeHtml(log.meta).replace(/'/g, "\\'") + '\')"';
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

    return '<div class="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-colors border-b border-slate-100 dark:border-gray-800 last:border-b-0' + cursorClass + '"' + clickAttr + '>' +
      '<div class="w-7 h-7 rounded-lg ' + cfg.bg + ' flex items-center justify-center flex-shrink-0 ' + cfg.text + '">' + cfg.icon + '</div>' +
      '<div class="flex-1 min-w-0">' +
        '<p class="text-xs text-slate-600 dark:text-gray-300 truncate">' + description + '</p>' +
        '<p class="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5">' + ago + '</p>' +
      '</div>' +
      reviewIndicator +
    '</div>';
  }).join('');
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
  // For moderation logs, show a simple alert with the details
  // meta format: "UserName | Category"
  var parts = meta.split(' | ');
  var userName = parts[0] || 'Unknown';
  var categoryName = parts[1] || 'Unknown Category';
  
  alert('Moderation Event\n\n' +
    'Type: ' + label + '\n' +
    'User: ' + userName + '\n' +
    'Category: ' + categoryName + '\n\n' +
    'The content was automatically filtered. To review user activity, use the User Management panel.');
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
