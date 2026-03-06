const TYPE_LABELS = {
  text: 'DISPATCH',
  photo: 'VISUAL RECORD',
  video: 'APPROVED MEDIA',
  link: 'EXTERNAL RESOURCE'
};

const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const composeForm = document.getElementById('compose-form');
const composeSuccess = document.getElementById('compose-success');
const postTypeSelect = document.getElementById('post-type');
const postList = document.getElementById('post-list');

// Media field containers
const photoFields = document.getElementById('photo-fields');
const videoFields = document.getElementById('video-fields');
const linkFields = document.getElementById('link-fields');

// Check auth status on load
async function checkAuth() {
  try {
    const res = await fetch('/admin/status');
    const data = await res.json();
    if (data.authenticated) {
      showDashboard();
    }
  } catch (e) {
    // Not authenticated
  }
}

function showDashboard() {
  loginSection.style.display = 'none';
  dashboardSection.classList.add('active');
  loadPosts();
}

function showLogin() {
  loginSection.style.display = 'block';
  dashboardSection.classList.remove('active');
}

// Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';

  const password = document.getElementById('password-input').value;

  try {
    const res = await fetch('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();

    if (data.success) {
      showDashboard();
    } else {
      loginError.textContent = data.message || 'ACCESS DENIED.';
    }
  } catch (err) {
    loginError.textContent = 'CONNECTION FAILURE. TRY AGAIN.';
  }
});

// Logout
logoutBtn.addEventListener('click', async () => {
  try {
    await fetch('/admin/logout', { method: 'POST' });
    showLogin();
    document.getElementById('password-input').value = '';
  } catch (err) {
    console.error('Logout failed:', err);
  }
});

// Toggle media fields based on post type
postTypeSelect.addEventListener('change', () => {
  const type = postTypeSelect.value;

  photoFields.classList.remove('active');
  videoFields.classList.remove('active');
  linkFields.classList.remove('active');

  if (type === 'photo') photoFields.classList.add('active');
  if (type === 'video') videoFields.classList.add('active');
  if (type === 'link') linkFields.classList.add('active');
});

// Compose form submit
composeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  composeSuccess.textContent = '';

  const type = postTypeSelect.value;
  const formData = new FormData();

  formData.append('type', type);
  formData.append('content', document.getElementById('post-content').value);

  const likes = document.getElementById('post-likes').value;
  if (likes) formData.append('likes', likes);

  const featured = document.getElementById('post-featured').checked;
  formData.append('featured', featured);

  if (type === 'photo') {
    const file = document.getElementById('post-photo').files[0];
    if (file) formData.append('photo', file);
  }

  if (type === 'video') {
    formData.append('mediaUrl', document.getElementById('post-video-url').value);
  }

  if (type === 'link') {
    formData.append('linkUrl', document.getElementById('post-link-url').value);
    formData.append('linkTitle', document.getElementById('post-link-title').value);
  }

  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      composeSuccess.textContent = 'DISPATCH FILED SUCCESSFULLY.';
      composeForm.reset();
      photoFields.classList.remove('active');
      videoFields.classList.remove('active');
      linkFields.classList.remove('active');
      loadPosts();

      setTimeout(() => { composeSuccess.textContent = ''; }, 3000);
    } else {
      const data = await res.json();
      composeSuccess.textContent = data.error || 'DISPATCH FILING FAILED.';
      composeSuccess.style.color = 'var(--accent)';
      setTimeout(() => {
        composeSuccess.style.color = '';
      }, 3000);
    }
  } catch (err) {
    composeSuccess.textContent = 'CONNECTION FAILURE.';
    composeSuccess.style.color = 'var(--accent)';
  }
});

// Load all posts for management
async function loadPosts() {
  try {
    const res = await fetch('/api/posts');
    const posts = await res.json();

    postList.innerHTML = '';

    if (posts.length === 0) {
      postList.innerHTML = '<li style="padding: 16px; text-align: center; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">NO DISPATCHES ON FILE.</li>';
      return;
    }

    posts.forEach(post => {
      const li = document.createElement('li');
      li.className = 'post-item' + (post.featured ? ' featured-item' : '');

      const truncated = (post.content || '').substring(0, 80) + ((post.content || '').length > 80 ? '...' : '');

      li.innerHTML = `
        <div class="post-item-info">
          <div class="post-item-type">${TYPE_LABELS[post.type] || 'DISPATCH'}</div>
          <div class="post-item-content">${escapeHtml(truncated)}</div>
        </div>
        <div class="post-item-actions">
          <button class="feature-btn ${post.featured ? 'is-featured' : ''}" data-id="${post.id}">
            ${post.featured ? 'UNFEATURE' : 'FEATURE'}
          </button>
          <button class="delete-btn" data-id="${post.id}">DELETE</button>
        </div>
      `;

      // Feature toggle
      li.querySelector('.feature-btn').addEventListener('click', async () => {
        await fetch(`/api/posts/${post.id}/feature`, { method: 'POST' });
        loadPosts();
      });

      // Delete
      li.querySelector('.delete-btn').addEventListener('click', async () => {
        if (confirm('CONFIRM REDACTION OF THIS DISPATCH?')) {
          await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
          loadPosts();
        }
      });

      postList.appendChild(li);
    });
  } catch (err) {
    postList.innerHTML = '<li style="padding: 16px; text-align: center; color: var(--accent);">FAILED TO RETRIEVE DISPATCHES.</li>';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Init
document.addEventListener('DOMContentLoaded', checkAuth);
