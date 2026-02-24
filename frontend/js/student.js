/**
 * ============================================================
 * STUDENT.JS — Grade Inquiry System (API-Connected)
 * Handles: form submission, inquiry list, secure download
 * ============================================================
 */

const API_BASE = 'http://localhost:5000/api';

// ── Helpers ─────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('gardnerHub_token');
}

function getUser() {
  const raw = localStorage.getItem('gardnerHub_user');
  return raw ? JSON.parse(raw) : null;
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer') || document.body;
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };
  const toast = document.createElement('div');
  toast.className = `${colors[type] || colors.info} text-white px-4 py-2 rounded-lg shadow-lg text-sm`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ── Profile & Auth ──────────────────────────────────────────
function loadProfile() {
  const user = getUser();
  if (!user) {
    // Not logged in — redirect
    window.location.href = '../../index.html';
    return;
  }

  const nameEl = document.getElementById('profileName');
  const idEl = document.getElementById('profileId');
  const initialEl = document.getElementById('profileInitial');

  if (nameEl) nameEl.textContent = user.full_name || 'Student';
  if (idEl) idEl.textContent = `ID: ${user.school_id || user.id}`;
  if (initialEl) initialEl.textContent = (user.full_name || 'S').charAt(0).toUpperCase();
}

function logout() {
  localStorage.removeItem('gardnerHub_token');
  localStorage.removeItem('gardnerHub_user');
  window.location.href = '../../index.html';
}

// ── Status Badge ────────────────────────────────────────────
function getStatusBadge(status) {
  const map = {
    resolved: {
      bg: 'bg-green-100 dark:bg-green-900/50',
      text: 'text-green-800 dark:text-green-300',
      label: 'Resolved',
      icon: '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>',
    },
    under_review: {
      bg: 'bg-orange-100 dark:bg-orange-900/50',
      text: 'text-orange-800 dark:text-orange-300',
      label: 'Under Review',
      icon: '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>',
    },
    pending: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/50',
      text: 'text-yellow-800 dark:text-yellow-300',
      label: 'Pending',
      icon: '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>',
    },
  };

  const s = map[status] || map.pending;
  return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}">
    <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">${s.icon}</svg>
    ${s.label}
  </span>`;
}

// ── Action Buttons ──────────────────────────────────────────
function getActionButton(inquiry) {
  if (inquiry.status === 'resolved' && inquiry.grade_file_path) {
    return `<button onclick="downloadRecord(${inquiry.id})" class="flex items-center space-x-1 bg-brand-900 dark:bg-white text-white dark:text-black px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-800 dark:hover:bg-gray-100 transition-colors duration-200">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
      <span>Download</span>
    </button>`;
  } else if (inquiry.status === 'resolved') {
    return `<span class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-600 dark:text-green-400">
      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
      </svg>
      Resolved
    </span>`;
  } else {
    return `<button disabled class="flex items-center space-x-1 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded-lg text-sm font-medium cursor-not-allowed">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <span>Processing</span>
    </button>`;
  }
}

// ── Render Table ────────────────────────────────────────────
function renderInquiriesTable(inquiries) {
  const tbody = document.getElementById('inquiriesTableBody');
  if (!tbody) return;

  if (!inquiries || inquiries.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-12 text-center">
          <svg class="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"/>
          </svg>
          <p class="text-sm text-gray-500 dark:text-gray-400">No grade requests submitted yet.</p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Use the button above to submit your first request.</p>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = inquiries.map(inq => {
    const date = new Date(inq.created_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
    return `
      <tr class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm font-medium text-gray-900 dark:text-white">GR-${String(inq.id).padStart(4, '0')}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-gray-900 dark:text-white">${date}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-gray-900 dark:text-white">Cumulative Grade Report</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          ${getStatusBadge(inq.status)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          ${getActionButton(inq)}
        </td>
      </tr>`;
  }).join('');
}

// ── Update Stat Cards ───────────────────────────────────────
function updateStats(inquiries) {
  const total = inquiries.length;
  const pending = inquiries.filter(i => i.status === 'pending').length;
  const underReview = inquiries.filter(i => i.status === 'under_review').length;
  const resolved = inquiries.filter(i => i.status === 'resolved').length;

  const el = (id) => document.getElementById(id);
  if (el('statTotal')) el('statTotal').textContent = total;
  if (el('statPending')) el('statPending').textContent = pending;
  if (el('statUnderReview')) el('statUnderReview').textContent = underReview;
  if (el('statResolved')) el('statResolved').textContent = resolved;
}

// ── Load Inquiries from API ─────────────────────────────────
async function loadInquiries() {
  try {
    const res = await fetch(`${API_BASE}/inquiries/my`, {
      headers: authHeaders(),
    });

    if (res.status === 401) {
      showToast('Session expired. Please log in again.', 'error');
      logout();
      return;
    }

    const data = await res.json();
    if (!res.ok) {
      showToast(data.message || 'Failed to load inquiries.', 'error');
      return;
    }

    renderInquiriesTable(data.inquiries);
    updateStats(data.inquiries);
  } catch (err) {
    console.error('Load inquiries error:', err);
    showToast('Unable to connect to the server.', 'error');
  }
}

// ── Modal Helpers ───────────────────────────────────────────
function openInquiryModal() {
  document.getElementById('inquiryModal').classList.remove('hidden');
  document.getElementById('inquiryModal').classList.add('flex');
}

function closeInquiryModal() {
  document.getElementById('inquiryModal').classList.add('hidden');
  document.getElementById('inquiryModal').classList.remove('flex');
  document.getElementById('gradeInquiryForm').reset();
}

// ── Secure Download Flow ────────────────────────────────────
let pendingDownloadInquiryId = null;

function downloadRecord(inquiryId) {
  pendingDownloadInquiryId = inquiryId;
  document.getElementById('downloadPassword').value = '';
  document.getElementById('passwordError').classList.add('hidden');
  document.getElementById('passwordModal').classList.remove('hidden');
  document.getElementById('passwordModal').classList.add('flex');
  document.getElementById('downloadPassword').focus();
}

function closePasswordModal() {
  pendingDownloadInquiryId = null;
  document.getElementById('passwordModal').classList.add('hidden');
  document.getElementById('passwordModal').classList.remove('flex');
}

async function confirmSecureDownload() {
  const password = document.getElementById('downloadPassword').value.trim();
  const errorEl = document.getElementById('passwordError');
  const btn = document.getElementById('confirmDownloadBtn');

  if (!password) {
    errorEl.textContent = 'Please enter your password.';
    errorEl.classList.remove('hidden');
    return;
  }

  // Disable button
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Verifying...';
  errorEl.classList.add('hidden');

  try {
    const res = await fetch(`${API_BASE}/inquiries/secure-download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ password, inquiryId: pendingDownloadInquiryId }),
    });

    if (res.status === 401) {
      errorEl.textContent = 'Incorrect password. Please try again.';
      errorEl.classList.remove('hidden');
      return;
    }

    if (!res.ok) {
      const data = await res.json();
      errorEl.textContent = data.message || 'Download failed.';
      errorEl.classList.remove('hidden');
      return;
    }

    // Success — download the blob
    const blob = await res.blob();
    const contentDisposition = res.headers.get('Content-Disposition');
    let filename = 'grade-file';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?(.+?)"?$/);
      if (match) filename = match[1];
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    closePasswordModal();
    showToast('Grade file downloaded successfully!', 'success');
  } catch (err) {
    console.error('Secure download error:', err);
    errorEl.textContent = 'Unable to connect to the server.';
    errorEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// ── Form Submit (New Inquiry) ───────────────────────────────
async function handleInquirySubmit(e) {
  e.preventDefault();

  const idProofFile = document.getElementById('idProof').files[0];

  if (!idProofFile) {
    showToast('Please upload your ID proof photo.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('idProof', idProofFile);

  // Disable submit button
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  try {
    const res = await fetch(`${API_BASE}/inquiries`, {
      method: 'POST',
      headers: authHeaders(), // No Content-Type — browser sets multipart boundary
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.message || 'Failed to submit inquiry.', 'error');
      return;
    }

    closeInquiryModal();
    showToast('Grade report request submitted successfully!', 'success');
    await loadInquiries();
  } catch (err) {
    console.error('Submit inquiry error:', err);
    showToast('Unable to connect to the server.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// ── Init ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Auth check & profile
  loadProfile();
  loadInquiries();

  // Populate student ID in modal
  const user = getUser();
  const studentIdInput = document.getElementById('studentIdInput');
  if (studentIdInput && user) {
    studentIdInput.value = user.school_id || '';
  }

  // Form handler
  const form = document.getElementById('gradeInquiryForm');
  if (form) {
    form.addEventListener('submit', handleInquirySubmit);
  }

  // Close modals on backdrop click
  const inquiryModal = document.getElementById('inquiryModal');
  if (inquiryModal) {
    inquiryModal.addEventListener('click', (e) => {
      if (e.target === inquiryModal) closeInquiryModal();
    });
  }

  const passwordModal = document.getElementById('passwordModal');
  if (passwordModal) {
    passwordModal.addEventListener('click', (e) => {
      if (e.target === passwordModal) closePasswordModal();
    });
  }

  // Enter key on password field
  const passwordInput = document.getElementById('downloadPassword');
  if (passwordInput) {
    passwordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmSecureDownload();
    });
  }

  // Profile dropdown
  const profileMenuBtn = document.getElementById('profileMenuBtn');
  const profileDropdown = document.getElementById('profileDropdown');
  if (profileMenuBtn && profileDropdown) {
    profileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle('hidden');
    });
    document.addEventListener('click', () => {
      if (!profileDropdown.classList.contains('hidden')) {
        profileDropdown.classList.add('hidden');
      }
    });
    profileDropdown.addEventListener('click', (e) => e.stopPropagation());
  }
});
