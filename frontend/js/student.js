/**
 * ============================================================
 * STUDENT.JS — Academic Document Request System (API-Connected)
 * Handles: form submission, request list, secure download
 * ============================================================
 */

const API_BASE = 'http://localhost:5000/api';
let _loadedInquiries = [];

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
    window.location.href = '../../index.html';
    return;
  }

  const nameEl = document.getElementById('profileName');
  const idEl = document.getElementById('profileId');
  const initialEl = document.getElementById('profileInitial');
  const profileLink = document.getElementById('profileLink');

  if (nameEl) nameEl.textContent = user.full_name || 'Student';
  if (idEl) idEl.textContent = `ID: ${user.school_id || user.id}`;
  if (initialEl) initialEl.textContent = (user.full_name || 'S').charAt(0).toUpperCase();

  // Set profile link based on role
  if (profileLink) {
    profileLink.href = user.role === 'faculty'
      ? '../faculty/profile.html'
      : 'profile.html';
  }
}

function logout() {
  localStorage.clear();
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
    rejected: {
      bg: 'bg-red-100 dark:bg-red-900/50',
      text: 'text-red-800 dark:text-red-300',
      label: 'Rejected',
      icon: '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>',
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
  const user = getUser();
  const isRegistrar = (user?.role === 'faculty' && user?.department_course === 'Registrar Office') || user?.role === 'admin';

  // Registrar/Admin: always show "Review Request" button
  if (isRegistrar) {
    return `<button onclick="openReviewModal(${inquiry.id})" class="flex items-center space-x-1 bg-indigo-600 dark:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors duration-200">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
      </svg>
      <span>Review Request</span>
    </button>`;
  }

  // Student views
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
function renderInquiriesTable(inquiries, showStudentCol = false) {
  const tbody = document.getElementById('inquiriesTableBody');
  if (!tbody) return;

  // Show/hide the student column header
  const thStudent = document.getElementById('thStudentName');
  if (thStudent) {
    thStudent.classList.toggle('hidden', !showStudentCol);
  }

  const colSpan = showStudentCol ? 6 : 5;

  if (!inquiries || inquiries.length === 0) {
    const emptyMsg = showStudentCol
      ? 'No student grade requests found.'
      : 'No grade requests submitted yet.';
    const emptyHint = showStudentCol
      ? 'Student requests will appear here once they are submitted.'
      : 'Use the button above to submit your first request.';
    tbody.innerHTML = `
      <tr>
        <td colspan="${colSpan}" class="px-6 py-12 text-center">
          <svg class="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"/>
          </svg>
          <p class="text-sm text-gray-500 dark:text-gray-400">${emptyMsg}</p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">${emptyHint}</p>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = inquiries.map(inq => {
    const date = new Date(inq.created_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
    const studentCell = showStudentCol
      ? `<td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm font-medium text-gray-900 dark:text-white">${inq.full_name || '—'}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">${inq.school_id || ''}</div>
        </td>`
      : '';
    const resolvedClass = inq.status === 'resolved' ? 'bg-green-50 dark:bg-green-900/10' : '';
    return `
      <tr class="${resolvedClass} hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm font-medium text-gray-900 dark:text-white">GR-${String(inq.id).padStart(4, '0')}</div>
        </td>
        ${studentCell}
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-gray-900 dark:text-white">${date}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-gray-900 dark:text-white">${inq.document_type || 'N/A'}</div>
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
  const user = getUser();
  const isStudent = user?.role === 'student';
  const isRegistrar = user?.role === 'faculty' && user?.department_course === 'Registrar Office';
  const isOtherFaculty = user?.role === 'faculty' && user?.department_course !== 'Registrar Office';

  const endpoint = isStudent
    ? `${API_BASE}/inquiries/my`
    : `${API_BASE}/inquiries/all`;

  try {
    const res = await fetch(endpoint, {
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

    // PATH C: Other faculty — use server-provided counts, no table data
    if (isOtherFaculty && data.counts) {
      const el = (id) => document.getElementById(id);
      if (el('statTotal')) el('statTotal').textContent = data.counts.total;
      if (el('statPending')) el('statPending').textContent = data.counts.pending;
      if (el('statUnderReview')) el('statUnderReview').textContent = data.counts.under_review;
      if (el('statResolved')) el('statResolved').textContent = data.counts.resolved;
      return;
    }

    // PATH A (student) or PATH B (Registrar): render full table
    _loadedInquiries = data.inquiries || [];
    renderInquiriesTable(data.inquiries, !isStudent);
    updateStats(data.inquiries);
  } catch (err) {
    console.error('Load inquiries error:', err);
    showToast('Unable to connect to the server.', 'error');
  }
}

// ── Role-Based UI Init (Three-Tier Access Control) ──────────
function initRoleBasedUI() {
  const user = getUser();
  const isStudent = user?.role === 'student';
  const isRegistrar = user?.role === 'faculty' && user?.department_course === 'Registrar Office';
  const isOtherFaculty = user?.role === 'faculty' && !isRegistrar;

  const btnRequestGrade = document.getElementById('btnRequestGrade');
  const pageTitle = document.getElementById('pageTitle');
  const pageDescription = document.getElementById('pageDescription');
  const privacyNotice = document.getElementById('privacyNotice');
  const requestsTableSection = document.getElementById('requestsTableSection');
  const restrictedBanner = document.getElementById('restrictedBanner');

  // PATH A: Student — private vault
  if (isStudent) {
    if (privacyNotice) privacyNotice.classList.remove('hidden');
    return;
  }

  // PATH B: Registrar Office — management hub
  if (isRegistrar) {
    if (btnRequestGrade) btnRequestGrade.style.display = 'none';
    if (pageTitle) pageTitle.textContent = 'Student Document Requests';
    if (pageDescription) pageDescription.textContent = 'Review and manage all student academic document requests.';
    return;
  }

  // PATH C: Other Faculty — statistical overview only
  if (isOtherFaculty) {
    if (btnRequestGrade) btnRequestGrade.style.display = 'none';
    if (pageTitle) pageTitle.textContent = 'Document Request Overview';
    if (pageDescription) pageDescription.textContent = 'System-wide statistics for academic document requests.';
    if (requestsTableSection) requestsTableSection.style.display = 'none';
    if (restrictedBanner) restrictedBanner.classList.remove('hidden');
    return;
  }

  // Admin fallback — full access like Registrar
  if (btnRequestGrade) btnRequestGrade.style.display = 'none';
  if (pageTitle) pageTitle.textContent = 'Student Document Requests';
  if (pageDescription) pageDescription.textContent = 'Review and manage all student academic document requests.';
}

// ── Modal Helpers ───────────────────────────────────────────
function openInquiryModal() {
  // Guard: only students can open the New Request modal
  const user = getUser();
  if (user?.role !== 'student') return;

  document.getElementById('inquiryModal').classList.remove('hidden');
  document.getElementById('inquiryModal').classList.add('flex');
}

function closeInquiryModal() {
  document.getElementById('inquiryModal').classList.add('hidden');
  document.getElementById('inquiryModal').classList.remove('flex');
  document.getElementById('gradeInquiryForm').reset();
}

// ── Registrar Review Modal ──────────────────────────────────
let _reviewInquiryId = null;

function openReviewModal(inquiryId) {
  const inq = _loadedInquiries.find(i => i.id === inquiryId);
  if (!inq) return;

  _reviewInquiryId = inquiryId;

  // Populate details
  document.getElementById('reviewStudentName').textContent = inq.full_name || '—';
  document.getElementById('reviewStudentId').textContent = inq.school_id || '—';
  document.getElementById('reviewDocType').textContent = inq.document_type || '—';
  document.getElementById('reviewRequestId').textContent = `GR-${String(inq.id).padStart(4, '0')}`;
  document.getElementById('reviewStatus').value = inq.status || 'pending';

  // Show ID photo
  const photo = document.getElementById('reviewIdPhoto');
  const placeholder = document.getElementById('reviewIdPlaceholder');
  if (inq.id_proof_path) {
    const photoUrl = `${API_BASE.replace('/api', '')}/${inq.id_proof_path}`;
    photo.src = photoUrl;
    photo.classList.remove('hidden');
    placeholder.classList.add('hidden');
  } else {
    photo.classList.add('hidden');
    placeholder.classList.remove('hidden');
  }

  // Reset file input
  document.getElementById('reviewFileUpload').value = '';

  // Open modal
  document.getElementById('registrarReviewModal').classList.remove('hidden');
  document.getElementById('registrarReviewModal').classList.add('flex');
}

function closeReviewModal() {
  _reviewInquiryId = null;
  document.getElementById('registrarReviewModal').classList.add('hidden');
  document.getElementById('registrarReviewModal').classList.remove('flex');
}

async function saveReviewChanges() {
  if (!_reviewInquiryId) return;

  const btn = document.getElementById('reviewSaveBtn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const newStatus = document.getElementById('reviewStatus').value;
    const file = document.getElementById('reviewFileUpload').files[0];

    // 1. Update status
    const statusRes = await fetch(`${API_BASE}/inquiries/${_reviewInquiryId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!statusRes.ok) {
      const data = await statusRes.json();
      showToast(data.message || 'Failed to update status.', 'error');
      return;
    }

    // 2. Upload file if provided
    if (file) {
      const formData = new FormData();
      formData.append('issuedDoc', file);

      const uploadRes = await fetch(`${API_BASE}/inquiries/${_reviewInquiryId}/upload-issued`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });

      if (!uploadRes.ok) {
        const data = await uploadRes.json();
        showToast(data.message || 'Failed to upload document.', 'error');
        return;
      }

      showToast('Document uploaded successfully!', 'success');
    } else {
      showToast('Status updated successfully!', 'success');
    }

    closeReviewModal();
    await loadInquiries();
  } catch (err) {
    console.error('Save review error:', err);
    showToast('Unable to connect to the server.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
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

// ── Form Submit (New Document Request) ──────────────────────
async function handleInquirySubmit(e) {
  e.preventDefault();

  const documentType = document.getElementById('documentType').value;
  const idProofFile = document.getElementById('idProof').files[0];

  if (!documentType) {
    showToast('Please select a document type.', 'error');
    return;
  }

  if (!idProofFile) {
    showToast('Please upload your ID proof photo.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('documentType', documentType);
  formData.append('idProof', idProofFile);

  // Disable submit button
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  try {
    const res = await fetch(`${API_BASE}/inquiries`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.message || 'Failed to submit request.', 'error');
      return;
    }

    closeInquiryModal();
    showToast('Document request submitted successfully!', 'success');
    await loadInquiries();
  } catch (err) {
    console.error('Submit request error:', err);
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

  // Apply role-based UI adjustments before loading data
  initRoleBasedUI();

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

  // Registrar review modal backdrop click
  const reviewModal = document.getElementById('registrarReviewModal');
  if (reviewModal) {
    reviewModal.addEventListener('click', (e) => {
      if (e.target === reviewModal) closeReviewModal();
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
