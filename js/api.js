const API_BASE = 'http://localhost:5000/api';

// Get stored token
function getToken() {
  return localStorage.getItem('animaker_token');
}

// Store token
function setToken(token) {
  localStorage.setItem('animaker_token', token);
}

// Remove token
function removeToken() {
  localStorage.removeItem('animaker_token');
}

// Get stored user
function getUser() {
  const user = localStorage.getItem('animaker_user');
  return user ? JSON.parse(user) : null;
}

// Store user
function setUser(user) {
  localStorage.setItem('animaker_user', JSON.stringify(user));
}

// Remove user
function removeUser() {
  localStorage.removeItem('animaker_user');
}

// API request helper
async function apiRequest(url, options = {}) {
  const token = getToken();

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    credentials: 'include',
    ...options
  };

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, config);

  // Handle empty/non-JSON responses (e.g. server down, 204, proxy errors)
  let data;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Unexpected server response (${response.status})`);
    }
  } else {
    if (!response.ok) {
      throw new Error(`Server error (${response.status})`);
    }
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

// Check if user is logged in
function isLoggedIn() {
  return !!getToken() && !!getUser();
}

// Logout
async function logout() {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } catch (e) {
    // Cookie might already be cleared
  }
  removeToken();
  removeUser();
  window.location.href = '../index.html';
}

// Update navbar based on auth state
function updateNavbarAuth() {
  const navActions = document.querySelector('.nav-actions');
  if (!navActions) return;

  if (isLoggedIn()) {
    const user = getUser();
    const displayName = user?.name || user?.username || 'User';
    const initial = displayName.charAt(0).toUpperCase();
    const isOnHomePage = window.location.pathname === '/' || window.location.pathname.endsWith('index.html');
    const prefix = isOnHomePage ? 'pages/' : '';
    navActions.innerHTML = `
      <button class="nav-user-btn" id="navUserBtn">${initial}</button>
      <div class="user-dropdown" id="userDropdown">
        <div class="user-dropdown-header">
          <div class="user-dropdown-avatar">${initial}</div>
          <div class="user-dropdown-info">
            <div class="user-dropdown-name">${displayName}</div>
            <div class="user-dropdown-email">${user?.email || ''}</div>
          </div>
        </div>
        <a href="${prefix}creator.html" class="user-dropdown-item"><i class="fas fa-film"></i> Creator Studio</a>
        <a href="${prefix}writer.html" class="user-dropdown-item"><i class="fas fa-pen-nib"></i> Writer Studio</a>
        <a href="${prefix}maker.html" class="user-dropdown-item"><i class="fas fa-cube"></i> Maker Studio</a>
        <div class="user-dropdown-divider"></div>
        <a href="#" class="user-dropdown-item"><i class="fas fa-user"></i> Your Profile</a>
        <a href="javascript:void(0)" class="user-dropdown-item" onclick="document.getElementById('userDropdown').classList.remove('show');openSettings()"><i class="fas fa-gear"></i> Settings</a>
        <div class="user-dropdown-divider"></div>
        <button class="user-dropdown-item logout" onclick="logout()"><i class="fas fa-right-from-bracket"></i> Log out</button>
      </div>
    `;
    document.getElementById('navUserBtn').addEventListener('click', function(e) {
      e.stopPropagation();
      document.getElementById('userDropdown').classList.toggle('show');
    });
  } else {
    const isOnHomePage = window.location.pathname === '/' || window.location.pathname.endsWith('index.html');
    const prefix = isOnHomePage ? 'pages/' : '';
    navActions.innerHTML = `
      <a href="${prefix}login.html" class="btn btn-ghost">Log in</a>
      <a href="${prefix}signup.html" class="btn btn-primary">Get Started</a>
    `;
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', function() {
  var dd = document.getElementById('userDropdown');
  if (dd) dd.classList.remove('show');
});

// Settings Panel (slides from sidebar)
function openSettings() {
  var existing = document.getElementById('settingsModal');
  if (existing) {
    existing.classList.add('show');
    document.body.style.overflow = 'hidden';
    return;
  }

  var overlay = document.createElement('div');
  overlay.id = 'settingsModal';
  overlay.className = 'settings-overlay show';
  overlay.innerHTML = `
    <div class="settings-backdrop" onclick="closeSettings()"></div>
    <div class="settings-panel">
      <div class="settings-header">
        <h2>Settings</h2>
        <button class="settings-close" onclick="closeSettings()"><i class="fas fa-xmark"></i></button>
      </div>
      <div class="settings-body" id="settingsBody">
        <div class="settings-group">
          <div class="settings-group-label">Account</div>
          <div class="settings-item"><i class="fas fa-user"></i><span class="settings-item-text">Edit Profile</span><i class="fas fa-chevron-right" style="font-size:12px;color:var(--text-muted);"></i></div>
          <div class="settings-item"><i class="fas fa-lock"></i><span class="settings-item-text">Change Password</span><i class="fas fa-chevron-right" style="font-size:12px;color:var(--text-muted);"></i></div>
          <div class="settings-item"><i class="fas fa-envelope"></i><span class="settings-item-text">Email Preferences</span><i class="fas fa-chevron-right" style="font-size:12px;color:var(--text-muted);"></i></div>
        </div>
        <div class="settings-group">
          <div class="settings-group-label">Notifications</div>
          <div class="settings-item">
            <i class="fas fa-bell"></i>
            <span class="settings-item-text">Push Notifications</span>
            <div class="toggle-switch active" onclick="event.stopPropagation();this.classList.toggle('active')"></div>
          </div>
          <div class="settings-item">
            <i class="fas fa-envelope"></i>
            <span class="settings-item-text">Email Notifications</span>
            <div class="toggle-switch active" onclick="event.stopPropagation();this.classList.toggle('active')"></div>
          </div>
          <div class="settings-item">
            <i class="fas fa-comment"></i>
            <span class="settings-item-text">Comment Notifications</span>
            <div class="toggle-switch" onclick="event.stopPropagation();this.classList.toggle('active')"></div>
          </div>
        </div>
        <div class="settings-group">
          <div class="settings-group-label">Privacy</div>
          <div class="settings-item">
            <i class="fas fa-eye"></i>
            <span class="settings-item-text">Private Account</span>
            <div class="toggle-switch" onclick="event.stopPropagation();this.classList.toggle('active')"></div>
          </div>
          <div class="settings-item">
            <i class="fas fa-eye-slash"></i>
            <span class="settings-item-text">Hide Activity Status</span>
            <div class="toggle-switch" onclick="event.stopPropagation();this.classList.toggle('active')"></div>
          </div>
          <div class="settings-item"><i class="fas fa-shield-halved"></i><span class="settings-item-text">Blocked Accounts</span><i class="fas fa-chevron-right" style="font-size:12px;color:var(--text-muted);"></i></div>
        </div>
        <div class="settings-group">
          <div class="settings-group-label">Appearance</div>
          <div class="settings-item"><i class="fas fa-language"></i><span class="settings-item-text">Language</span><span class="settings-item-value">English</span></div>
        </div>
        <div class="settings-group">
          <div class="settings-group-label">Support</div>
          <div class="settings-item"><i class="fas fa-circle-question"></i><span class="settings-item-text">Help Center</span><i class="fas fa-chevron-right" style="font-size:12px;color:var(--text-muted);"></i></div>
          <div class="settings-item"><i class="fas fa-file-lines"></i><span class="settings-item-text">Terms of Service</span><i class="fas fa-chevron-right" style="font-size:12px;color:var(--text-muted);"></i></div>
          <div class="settings-item"><i class="fas fa-shield"></i><span class="settings-item-text">Privacy Policy</span><i class="fas fa-chevron-right" style="font-size:12px;color:var(--text-muted);"></i></div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  // Prevent background scroll when scrolling inside settings
  var body = document.getElementById('settingsBody');
  body.addEventListener('wheel', function(e) {
    var atTop = body.scrollTop === 0 && e.deltaY < 0;
    var atBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 1 && e.deltaY > 0;
    if (!atTop && !atBottom) {
      e.stopPropagation();
    }
  }, { passive: true });
}

function closeSettings() {
  var m = document.getElementById('settingsModal');
  if (m) {
    m.classList.remove('show');
    document.body.style.overflow = '';
  }
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeSettings();
    var dd = document.getElementById('userDropdown');
    if (dd) dd.classList.remove('show');
  }
});
