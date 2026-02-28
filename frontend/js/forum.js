/**
 * ============================================================
 * FORUM.JS — The Gardner Hub Category Dashboard
 * Vanilla JavaScript — No frameworks
 * ============================================================
 */

// ── Category Data ──────────────────────────────────────────
const categories = [
  {
    id: 'announcements',
    title: 'Official Announcements',
    description:
      'Stay updated with the latest school-wide announcements, policy changes, and important notices from the administration.',
    icon: 'megaphone',
    color: 'blue',
    tags: ['Enrollment', 'Class Schedule', 'Events', 'Suspensions'],
    topics: 0,
    posts: 0,
    latestActivity: null,
  },
  {
    id: 'academic',
    title: 'Academic Discussion',
    description:
      'Engage in meaningful academic conversations — ask questions, share insights on lessons, and collaborate with school organizations.',
    icon: 'book',
    color: 'indigo',
    tags: ['Lessons', 'Q&A', 'School Org'],
    topics: 0,
    posts: 0,
    latestActivity: null,
  },
  {
    id: 'materials',
    title: 'Learning Materials',
    description:
      'Access and share educational resources including PDFs, handouts, lecture notes, and supplementary reading materials.',
    icon: 'folder',
    color: 'emerald',
    tags: ['PDFs', 'Handouts', 'Lecture Notes'],
    topics: 0,
    posts: 0,
    latestActivity: null,
  },
  {
    id: 'grades',
    title: 'Grade Consultation',
    description:
      'A private and secure space for students and faculty to discuss grades, academic performance, and consultation schedules.',
    icon: 'lock',
    color: 'amber',
    isPrivate: true,
    tags: ['Private', 'Secure'],
    topics: 0,
    posts: 0,
    latestActivity: null,
  },
];

// ── SVG Icon Map ───────────────────────────────────────────
const icons = {
  megaphone: `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38a.75.75 0 0 1-1.002-.287 16.146 16.146 0 0 1-1.553-4.387m2.69 0a18.94 18.94 0 0 0 2.69 0m0 0a18.52 18.52 0 0 0 3.36-.504c1.073-.307 2.1-1.049 2.1-2.233V8.897c0-1.184-1.027-1.926-2.1-2.233a18.52 18.52 0 0 0-3.36-.504m0 9.68V6.16"/>
  </svg>`,
  book: `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"/>
  </svg>`,
  folder: `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.776V4.5A2.25 2.25 0 0 1 6 2.25h3.879a1.5 1.5 0 0 1 1.06.44l1.122 1.121a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 6.5v3.276M3.75 9.776l-.443 8.864A2.25 2.25 0 0 0 5.552 21h12.896a2.25 2.25 0 0 0 2.245-2.36l-.443-8.864M3.75 9.776h16.5"/>
  </svg>`,
  lock: `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"/>
  </svg>`,
};

// ── Color Scheme Map ───────────────────────────────────────
const colorMap = {
  blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-700 dark:text-blue-300',    ring: 'ring-blue-200 dark:ring-blue-700',    tagBg: 'bg-blue-100 dark:bg-blue-800/30',    tagText: 'text-blue-700 dark:text-blue-300' },
  indigo:  { bg: 'bg-indigo-50 dark:bg-indigo-900/20',  text: 'text-indigo-700 dark:text-indigo-300',  ring: 'ring-indigo-200 dark:ring-indigo-700',  tagBg: 'bg-indigo-100 dark:bg-indigo-800/30',  tagText: 'text-indigo-700 dark:text-indigo-300' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', ring: 'ring-emerald-200 dark:ring-emerald-700', tagBg: 'bg-emerald-100 dark:bg-emerald-800/30', tagText: 'text-emerald-700 dark:text-emerald-300' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20',   text: 'text-amber-700 dark:text-amber-300',   ring: 'ring-amber-200 dark:ring-amber-700',   tagBg: 'bg-amber-100 dark:bg-amber-800/30',   tagText: 'text-amber-700 dark:text-amber-300' },
};

// ── Role badge colors ──────────────────────────────────────
const roleBadge = {
  Admin:   'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  Faculty: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  Student: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300',
};

// ── Render Categories ──────────────────────────────────────
function renderCategories(data) {
  const container = document.getElementById('categoryList');
  container.innerHTML = '';

  if (data.length === 0) {
    container.innerHTML = `
      <div class="text-center py-16 text-gray-400 dark:text-gray-500">
        <svg class="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"/>
        </svg>
        <p class="text-sm font-medium">No categories match your search.</p>
      </div>`;
    return;
  }

  data.forEach((cat) => {
    const c = colorMap[cat.color];
    const la = cat.latestActivity;
    const badge = la ? (roleBadge[la.role] || 'bg-gray-100 text-gray-600') : '';

    const card = document.createElement('div');
    card.className =
      'category-card bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden cursor-pointer transition-colors duration-200';
    card.setAttribute('data-category', cat.id);

    card.innerHTML = `
      <div class="flex flex-col lg:flex-row">
        <!-- Left section: Icon + Info -->
        <div class="flex-1 p-5 sm:p-6 flex gap-4">
          <!-- Icon -->
          <div class="shrink-0 w-12 h-12 rounded-xl ${c.bg} ${c.text} ring-1 ${c.ring} flex items-center justify-center">
            ${icons[cat.icon]}
          </div>
          <!-- Text -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="text-base sm:text-lg font-semibold text-gray-900 dark:text-white leading-snug">${cat.title}</h3>
              ${cat.isPrivate
                ? '<span class="secure-badge inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">🔒 Private</span>'
                : ''}
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">${cat.description}</p>
            <!-- Tags -->
            <div class="flex flex-wrap gap-1.5 mt-3">
              ${cat.tags
                .map(
                  (tag) =>
                    `<span class="tag-badge inline-block text-[11px] font-medium ${c.tagBg} ${c.tagText} px-2.5 py-0.5 rounded-full cursor-pointer">${tag}</span>`
                )
                .join('')}
            </div>
            <!-- Stats (mobile) -->
            <div class="flex items-center gap-4 mt-3 lg:hidden text-xs text-gray-400 dark:text-gray-500">
              <span>${cat.topics} topics</span>
              <span>${cat.posts} posts</span>
            </div>
          </div>
        </div>

        <!-- Right section: Stats + Latest Activity -->
        <div class="hidden lg:flex items-center gap-6 border-l border-gray-100 dark:border-gray-800 px-6 py-5 w-[380px] shrink-0">
          <!-- Stats -->
          <div class="flex flex-col items-center gap-0.5 text-center min-w-[60px]">
            <span class="text-lg font-bold text-gray-800 dark:text-gray-200">${cat.topics}</span>
            <span class="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">Topics</span>
          </div>
          <div class="flex flex-col items-center gap-0.5 text-center min-w-[60px]">
            <span class="text-lg font-bold text-gray-800 dark:text-gray-200">${cat.posts}</span>
            <span class="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">Posts</span>
          </div>
          <!-- Separator -->
          <div class="w-px h-10 bg-gray-200 dark:bg-gray-800"></div>
          <!-- Latest Activity -->
          <div class="flex-1 min-w-0">
            ${la
              ? `<p class="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">${la.title}</p>
                 <div class="flex items-center gap-2 mt-1">
                   <span class="text-xs text-gray-500 dark:text-gray-400">${la.author}</span>
                   <span class="inline-block text-[10px] font-semibold ${badge} px-1.5 py-0.5 rounded">${la.role}</span>
                   <span class="text-[11px] text-gray-400 dark:text-gray-500">&middot; ${la.time}</span>
                 </div>`
              : `<p class="text-sm text-gray-400 dark:text-gray-500 italic">No recent activity</p>`
            }
          </div>
        </div>
      </div>

      <!-- Latest Activity (mobile) -->
      <div class="lg:hidden border-t border-gray-100 dark:border-gray-800 px-5 py-3 flex items-center gap-2 bg-gray-50/60 dark:bg-gray-900/60">
        <span class="text-xs text-gray-400 dark:text-gray-500 shrink-0">Latest:</span>
        ${la
          ? `<p class="text-xs text-gray-600 dark:text-gray-300 truncate flex-1 font-medium">${la.title}</p>
             <span class="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">${la.time}</span>`
          : `<p class="text-xs text-gray-400 dark:text-gray-500 italic flex-1">No recent activity</p>`
        }
      </div>
    `;

    container.appendChild(card);
  });
}

// ── Search Filter ──────────────────────────────────────────
function handleSearch(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    renderCategories(categories);
    return;
  }
  const filtered = categories.filter(
    (cat) =>
      cat.title.toLowerCase().includes(q) ||
      cat.description.toLowerCase().includes(q) ||
      cat.tags.some((t) => t.toLowerCase().includes(q))
  );
  renderCategories(filtered);
}

// ── Modal Helpers ──────────────────────────────────────────
function openModal() {
  const modal = document.getElementById('newTopicModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';

  // Populate category dropdown
  const select = document.getElementById('topicCategory');
  select.innerHTML = '<option value="">Select a category…</option>';
  categories.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.title + (cat.isPrivate ? ' 🔒' : '');
    select.appendChild(opt);
  });
}

function closeModal() {
  const modal = document.getElementById('newTopicModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.body.style.overflow = '';
  document.getElementById('newTopicForm').reset();
}

// ── Initialization ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Render categories on load
  renderCategories(categories);

  // Demo function: Simulate different user roles (call in console: switchUserRole('faculty') or switchUserRole('student'))
  window.switchUserRole = function(role) {
    const profileName = document.querySelector('#profileBtn .text-sm');
    const profileRole = document.querySelector('#profileBtn .text-[10px]');
    const dropdownName = document.querySelector('#profileDropdown .text-sm');
    const dropdownEmail = document.querySelector('#profileDropdown .text-xs');
    const dropdownBadge = document.querySelector('#profileDropdown .inline-block');
    
    const users = {
      admin: {
        name: 'Admin User',
        email: 'admin@gardner.edu.ph',
        role: 'Administrator',
        badgeClass: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      },
      faculty: {
        name: 'Dr. Maria Santos',
        email: 'maria.santos@gardner.edu.ph',
        role: 'Faculty',
        badgeClass: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
      },
      student: {
        name: 'John Dela Cruz',
        email: 'john.delacruz@gardner.edu.ph',
        role: 'Student',
        badgeClass: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
      }
    };
    
    const user = users[role];
    if (user) {
      profileName.textContent = user.name;
      profileRole.textContent = user.role;
      dropdownName.textContent = user.name;
      dropdownEmail.textContent = user.email;
      dropdownBadge.className = `inline-block mt-1 text-[10px] font-semibold ${user.badgeClass} px-2 py-0.5 rounded-full uppercase tracking-wide`;
      dropdownBadge.textContent = user.role;
      console.log(`Switched to ${user.role}: ${user.name}`);
    }
  };

  // Desktop search
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', (e) => handleSearch(e.target.value));

  // Mobile search toggle
  const mobileSearchBtn = document.getElementById('mobileSearchBtn');
  const mobileSearch = document.getElementById('mobileSearch');
  mobileSearchBtn.addEventListener('click', () => {
    mobileSearch.classList.toggle('hidden');
    if (!mobileSearch.classList.contains('hidden')) {
      mobileSearch.querySelector('input').focus();
    }
  });

  // Mobile search input
  const mobileInput = mobileSearch.querySelector('input');
  mobileInput.addEventListener('input', (e) => handleSearch(e.target.value));

  // New Topic modal
  document.getElementById('newTopicBtn').addEventListener('click', openModal);
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);

  // Close modal on backdrop click
  document.getElementById('newTopicModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Form submit handler
  document.getElementById('newTopicForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('topicTitle').value.trim();
    const category = document.getElementById('topicCategory').value;
    const body = document.getElementById('topicBody').value.trim();

    if (!category) {
      alert('Please select a category.');
      return;
    }

    // In a real app this would POST to the backend
    console.log('New topic submitted:', { category, title, body });
    alert(`Topic "${title}" created successfully!`);
    closeModal();
  });

  // Category card click navigation
  document.getElementById('categoryList').addEventListener('click', (e) => {
    const card = e.target.closest('.category-card');
    if (card) {
      const catId = card.getAttribute('data-category');
      window.location.href = 'pages/forum/category-view.html?category=' + catId;
    }
  });

  // Profile dropdown toggle
  const profileBtn = document.getElementById('profileBtn');
  const profileDropdown = document.getElementById('profileDropdown');

  profileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    
    if (profileDropdown.classList.contains('hidden')) {
      // Show dropdown
      profileDropdown.classList.remove('hidden');
      setTimeout(() => {
        profileDropdown.classList.remove('opacity-0', 'scale-95');
        profileDropdown.classList.add('opacity-100', 'scale-100');
      }, 10);
    } else {
      // Hide dropdown
      profileDropdown.classList.remove('opacity-100', 'scale-100');
      profileDropdown.classList.add('opacity-0', 'scale-95');
      setTimeout(() => {
        profileDropdown.classList.add('hidden');
      }, 200);
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!profileDropdown.classList.contains('hidden') && !profileDropdown.contains(e.target) && !profileBtn.contains(e.target)) {
      profileDropdown.classList.remove('opacity-100', 'scale-100');
      profileDropdown.classList.add('opacity-0', 'scale-95');
      setTimeout(() => {
        profileDropdown.classList.add('hidden');
      }, 200);
    }
  });

  // Prevent dropdown from closing when clicking inside
  profileDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Logout functionality
  document.getElementById('logoutBtn').addEventListener('click', () => {
    // Clear any stored session data
    localStorage.removeItem('userSession');
    localStorage.removeItem('currentUser');
    sessionStorage.clear();
    
    // Show confirmation message and redirect
    if (confirm('Are you sure you want to sign out?')) {
      // Hide the dropdown first
      profileDropdown.classList.remove('opacity-100', 'scale-100');
      profileDropdown.classList.add('opacity-0', 'scale-95');
      setTimeout(() => {
        profileDropdown.classList.add('hidden');
      }, 200);
      
      // Show success message and redirect
      alert('Successfully signed out! Redirecting to login...');
      window.location.href = '../../index.html';
    }
  });
});
