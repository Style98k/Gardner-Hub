// ── Student Grade Inquiry Logic ──────────────────────────────────────────────

// Sample inquiries data
const inquiriesData = [
  {
    id: 'GI-2026-001',
    date: 'Feb 24, 2026',
    term: 'Spring 2026',
    type: 'Grade Discrepancy',
    status: 'Under Review',
    submittedDate: new Date('2026-02-24')
  },
  {
    id: 'GI-2026-002',
    date: 'Feb 22, 2026',
    term: 'Fall 2025',
    type: 'Transcript Request',
    status: 'Resolved',
    submittedDate: new Date('2026-02-22')
  },
  {
    id: 'GI-2026-003',
    date: 'Feb 20, 2026',
    term: 'Fall 2025',
    type: 'Grade Verification',
    status: 'Resolved',
    submittedDate: new Date('2026-02-20')
  },
  {
    id: 'GI-2026-004',
    date: 'Feb 18, 2026',
    term: 'Summer 2025',
    type: 'Missing Grade',
    status: 'Under Review',
    submittedDate: new Date('2026-02-18')
  },
  {
    id: 'GI-2026-005',
    date: 'Feb 15, 2026',
    term: 'Spring 2025',
    type: 'Academic Record Inquiry',
    status: 'Resolved',
    submittedDate: new Date('2026-02-15')
  },
  {
    id: 'GI-2026-006',
    date: 'Feb 12, 2026',
    term: 'Fall 2024',
    type: 'Grade Discrepancy',
    status: 'Under Review',
    submittedDate: new Date('2026-02-12')
  },
  {
    id: 'GI-2026-007',
    date: 'Feb 10, 2026',
    term: 'Fall 2024',
    type: 'Transcript Request',
    status: 'Resolved',
    submittedDate: new Date('2026-02-10')
  },
  {
    id: 'GI-2026-008',
    date: 'Feb 8, 2026',
    term: 'Summer 2024',
    type: 'Grade Verification',
    status: 'Resolved',
    submittedDate: new Date('2026-02-08')
  }
];

function getStatusBadge(status) {
  if (status === 'Resolved') {
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300">
      <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
      </svg>
      Resolved
    </span>`;
  } else {
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300">
      <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
      </svg>
      Under Review
    </span>`;
  }
}

function getActionButton(inquiry) {
  if (inquiry.status === 'Resolved' && (inquiry.type === 'Transcript Request' || inquiry.type === 'Academic Record Inquiry')) {
    return `<button onclick="downloadRecord('${inquiry.id}')" class="flex items-center space-x-1 bg-brand-900 dark:bg-white text-white dark:text-black px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-800 dark:hover:bg-gray-100 transition-colors duration-200">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
      <span>Download</span>
    </button>`;
  } else if (inquiry.status === 'Resolved') {
    return `<button onclick="viewResponse('${inquiry.id}')" class="flex items-center space-x-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors duration-200">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
      </svg>
      <span>View Response</span>
    </button>`;
  } else {
    return `<button disabled class="flex items-center space-x-1 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded-lg text-sm font-medium cursor-not-allowed">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <span>Processing</span>
    </button>`;
  }
}

function renderInquiriesTable() {
  const tbody = document.getElementById('inquiriesTableBody');

  const rows = inquiriesData.map(inquiry => `
    <tr class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200">
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm font-medium text-gray-900 dark:text-white">${inquiry.id}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-900 dark:text-white">${inquiry.date}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-900 dark:text-white">${inquiry.term}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-900 dark:text-white">${inquiry.type}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        ${getStatusBadge(inquiry.status)}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        ${getActionButton(inquiry)}
      </td>
    </tr>
  `).join('');

  tbody.innerHTML = rows;
}

function openInquiryModal() {
  document.getElementById('inquiryModal').classList.remove('hidden');
  document.getElementById('inquiryModal').classList.add('flex');
}

function closeInquiryModal() {
  document.getElementById('inquiryModal').classList.add('hidden');
  document.getElementById('inquiryModal').classList.remove('flex');
}

function downloadRecord(inquiryId) {
  const toast = document.createElement('div');
  toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
  toast.textContent = `Downloading academic record for ${inquiryId}...`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 3000);
}

function viewResponse(inquiryId) {
  const toast = document.createElement('div');
  toast.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
  toast.textContent = `Viewing response for inquiry ${inquiryId}...`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 3000);
}

function goBack() {
  if (document.referrer) {
    window.history.back();
  } else {
    window.location.href = '../forum/hub.html';
  }
}

// Form submission
document.addEventListener('DOMContentLoaded', function () {
  renderInquiriesTable();

  const form = document.getElementById('gradeInquiryForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const term = document.getElementById('term').value;
      const inquiryType = document.getElementById('inquiryType').value;

      const newInquiryId = `GI-2026-${String(inquiriesData.length + 1).padStart(3, '0')}`;

      const newInquiry = {
        id: newInquiryId,
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        term: term,
        type: inquiryType,
        status: 'Under Review',
        submittedDate: new Date()
      };

      inquiriesData.unshift(newInquiry);
      renderInquiriesTable();
      closeInquiryModal();

      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = `Grade inquiry ${newInquiryId} submitted successfully!`;
      document.body.appendChild(toast);
      setTimeout(() => { toast.remove(); }, 3000);
    });
  }

  // Close modal when clicking outside
  const modal = document.getElementById('inquiryModal');
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === this) {
        closeInquiryModal();
      }
    });
  }
});
