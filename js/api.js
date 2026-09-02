/* =========================================================
   AniMaker — API & Authentication Layer
   ========================================================= */

const API_BASE = 'http://localhost:5000/api';

/* ---- Local-storage helpers ---- */

function getToken() {
  return localStorage.getItem('animaker_token');
}

function setToken(token) {
  localStorage.setItem('animaker_token', token);
}

function removeToken() {
  localStorage.removeItem('animaker_token');
}

function getUser() {
  try {
    const raw = localStorage.getItem('animaker_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setUser(user) {
  localStorage.setItem('animaker_user', JSON.stringify(user));
}

function removeUser() {
  localStorage.removeItem('animaker_user');
}

function isLoggedIn() {
  return !!getToken();
}

/* ---- Safe redirect helpers ---- */

// Pages that are safe to redirect to (prevents open-redirect attacks)
const SAFE_REDIRECT_PATHS = [
  'index.html',
  'pages/creator.html',
  'pages/writer.html',
  'pages/maker.html',
  'pages/about.html',
  'pages/services.html',
  'pages/contact.html'
];

function getRedirectUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('redirect');
  if (!raw) return null;

  // Decode and normalise
  const decoded = decodeURIComponent(raw);

  // Only allow relative paths starting with ../ or no protocol
  if (/^https?:\/\//i.test(decoded)) return null;

  // Strip leading slashes and ../ prefixes to get a clean relative path
  const cleaned = decoded.replace(/^(\.\.\/)*/, '');

  // Check it's in our safe list
  if (SAFE_REDIRECT_PATHS.includes(cleaned)) return cleaned;

  // Also allow it if it starts with a safe path prefix
  for (const safe of SAFE_REDIRECT_PATHS) {
    if (cleaned === safe || cleaned === '../' + safe) return cleaned;
  }

  return null;
}

function safeRedirect(targetPath) {
  const currentPath = window.location.pathname;
  const isOnRoot = currentPath === '/' || currentPath.endsWith('index.html');

  if (isOnRoot) {
    window.location.href = targetPath.startsWith('pages/') ? targetPath : targetPath;
  } else {
    // We're inside /pages/ — use ../ to go up
    const clean = targetPath.replace(/^(\.\.\/)+/, '');
    window.location.href = clean.startsWith('pages/') ? '../' + clean : clean;
  }
}

/* ---- API request with global 401 handling ---- */

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
    config.headers['Authorization'] = 'Bearer ' + token;
  }

  let response;
  try {
    response = await fetch(API_BASE + url, config);
  } catch (err) {
    // Network error / backend offline
    throw new Error('Unable to connect to server. Please check your connection.');
  }

  // Handle empty / non-JSON responses
  let data;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error('Unexpected server response (' + response.status + ')');
    }
  } else {
    if (!response.ok) {
      throw new Error('Server error (' + response.status + ')');
    }
    data = {};
  }

  // Global 401 handling — clear stale auth
  if (response.status === 401) {
    removeToken();
    removeUser();
    updateNavbarAuth && updateNavbarAuth();
  }

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

/* ---- Session restoration: verify token with backend ---- */

async function checkAuth() {
  if (!getToken()) return null;

  try {
    const data = await apiRequest('/auth/me');
    if (data && data.user) {
      setUser(data.user);
      return data.user;
    }
  } catch {
    // Token invalid/expired — already cleared by apiRequest 401 handler
  }
  return null;
}

/**
 * requireAuth() — for protected pages.
 *
 * Returns a promise that resolves with the user if authenticated,
 * or redirects to login with ?redirect= and never resolves.
 *
 * Shows a loading overlay while checking.
 */
function requireAuth() {
  return new Promise(async (resolve) => {
    // Quick local check first
    if (!getToken()) {
      redirectToLogin();
      return; // never resolves
    }

    // Show loading overlay
    const overlay = document.getElementById('authLoading');
    if (overlay) overlay.style.display = 'flex';

    const user = await checkAuth();

    if (user) {
      // Hide loading, show page
      if (overlay) overlay.style.display = 'none';
      document.body.classList.add('auth-checked');
      resolve(user);
    } else {
      redirectToLogin();
    }
  });
}

function redirectToLogin() {
  const currentPath = window.location.pathname;
  const isOnRoot = currentPath === '/' || currentPath.endsWith('index.html');

  let loginUrl;
  if (isOnRoot) {
    loginUrl = 'pages/login.html';
  } else {
    loginUrl = 'login.html';
  }

  // Build redirect param — point back to the current page
  let returnPage;
  if (isOnRoot) {
    returnPage = 'index.html';
  } else {
    // Extract filename from path (e.g. /pages/creator.html → creator.html)
    const parts = currentPath.split('/');
    const filename = parts[parts.length - 1];
    returnPage = 'pages/' + filename;
  }

  window.location.href = loginUrl + '?redirect=' + encodeURIComponent(returnPage);
}

/* ---- Logout ---- */

async function logout() {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } catch {
    // Cookie might already be cleared — that's fine
  }

  removeToken();
  removeUser();
  updateNavbarAuth && updateNavbarAuth();

  // Redirect to homepage (handle relative paths)
  const currentPath = window.location.pathname;
  const isOnRoot = currentPath === '/' || currentPath.endsWith('index.html');
  window.location.href = isOnRoot ? 'index.html' : '../index.html';
}

/* ---- Navbar auth state ---- */

function updateNavbarAuth() {
  const navActions = document.querySelector('.nav-actions');
  if (!navActions) return;

  if (isLoggedIn()) {
    const user = getUser();
    const displayName = (user && (user.name || user.username)) || 'User';
    const initial = displayName.charAt(0).toUpperCase();
    const isOnRoot = window.location.pathname === '/' || window.location.pathname.endsWith('index.html');
    const prefix = isOnRoot ? 'pages/' : '';

    navActions.innerHTML =
      '<button class="nav-user-btn" id="navUserBtn">' + initial + '</button>' +
      '<div class="user-dropdown" id="userDropdown">' +
        '<div class="user-dropdown-header">' +
          '<div class="user-dropdown-avatar">' + initial + '</div>' +
          '<div class="user-dropdown-info">' +
            '<div class="user-dropdown-name">' + displayName + '</div>' +
            '<div class="user-dropdown-email">' + ((user && user.email) || '') + '</div>' +
          '</div>' +
        '</div>' +
        '<a href="' + prefix + 'creator.html" class="user-dropdown-item"><i class="fas fa-film"></i> Creator Studio</a>' +
        '<a href="' + prefix + 'writer.html" class="user-dropdown-item"><i class="fas fa-pen-nib"></i> Writer Studio</a>' +
        '<a href="' + prefix + 'maker.html" class="user-dropdown-item"><i class="fas fa-cube"></i> Maker Studio</a>' +
        '<div class="user-dropdown-divider"></div>' +
        '<a href="#" class="user-dropdown-item"><i class="fas fa-user"></i> Your Profile</a>' +
        '<a href="javascript:void(0)" class="user-dropdown-item" onclick="document.getElementById(\'userDropdown\').classList.remove(\'show\');openSettings()"><i class="fas fa-gear"></i> Settings</a>' +
        '<div class="user-dropdown-divider"></div>' +
        '<button class="user-dropdown-item logout" onclick="logout()"><i class="fas fa-right-from-bracket"></i> Log out</button>' +
      '</div>';

    document.getElementById('navUserBtn').addEventListener('click', function(e) {
      e.stopPropagation();
      document.getElementById('userDropdown').classList.toggle('show');
    });
  } else {
    const isOnRoot = window.location.pathname === '/' || window.location.pathname.endsWith('index.html');
    const prefix = isOnRoot ? 'pages/' : '';
    navActions.innerHTML =
      '<a href="' + prefix + 'login.html" class="btn btn-ghost">Log in</a>' +
      '<a href="' + prefix + 'signup.html" class="btn btn-primary">Get Started</a>';
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', function() {
  const dd = document.getElementById('userDropdown');
  if (dd) dd.classList.remove('show');
});

/* ---- Settings Panel ---- */

function openSettings() {
  let existing = document.getElementById('settingsModal');
  if (existing) {
    existing.classList.add('show');
    document.body.style.overflow = 'hidden';
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'settingsModal';
  overlay.className = 'settings-overlay show';
  overlay.innerHTML =
    '<div class="settings-backdrop" onclick="closeSettings()"></div>' +
    '<div class="settings-panel">' +
      '<div class="settings-header">' +
        '<h2>Settings</h2>' +
        '<button class="settings-close" onclick="closeSettings()"><i class="fas fa-xmark"></i></button>' +
      '</div>' +
      '<div class="settings-body" id="settingsBody">' +
        '<div class="settings-group">' +
          '<div class="settings-group-label">Account</div>' +
          '<div class="settings-item"><i class="fas fa-user"></i><span class="settings-item-text">Edit Profile</span><i class="fas fa-chevron-right" style="font-size:12px;color:var(--text-muted);"></i></div>' +
          '<div class="settings-item"><i class="fas fa-lock"></i><span class="settings-item-text">Change Password</span><i class="fas fa-chevron-right" style="font-size:12px;color:var(--text-muted);"></i></div>' +
          '<div class="settings-item"><i class="fas fa-envelope"></i><span class="settings-item-text">Email Preferences</span><i class="fas fa-chevron-right" style="font-size:12px;color:var(--text-muted);"></i></div>' +
        '</div>' +
        '<div class="settings-group">' +
          '<div class="settings-group-label">Notifications</div>' +
          '<div class="settings-item"><i class="fas fa-bell"></i><span class="settings-item-text">Push Notifications</span><div class="toggle-switch active" onclick="event.stopPropagation();this.classList.toggle(\'active\')"></div></div>' +
          '<div class="settings-item"><i class="fas fa-envelope"></i><span class="settings-item-text">Email Notifications</span><div class="toggle-switch active" onclick="event.stopPropagation();this.classList.toggle(\'active\')"></div></div>' +
          '<div class="settings-item"><i class="fas fa-comment"></i><span class="settings-item-text">Comment Notifications</span><div class="toggle-switch" onclick="event.stopPropagation();this.classList.toggle(\'active\')"></div></div>' +
        '</div>' +
        '<div class="settings-group">' +
          '<div class="settings-group-label">Privacy</div>' +
          '<div class="settings-item"><i class="fas fa-eye"></i><span class="settings-item-text">Private Account</span><div class="toggle-switch" onclick="event.stopPropagation();this.classList.toggle(\'active\')"></div></div>' +
          '<div class="settings-item"><i class="fas fa-eye-slash"></i><span class="settings-item-text">Hide Activity Status</span><div class="toggle-switch" onclick="event.stopPropagation();this.classList.toggle(\'active\')"></div></div>' +
          '<div class="settings-item"><i class="fas fa-shield-halved"></i><span class="settings-item-text">Blocked Accounts</span><i class="fas fa-chevron-right" style="font-size:12px;color:var(--text-muted);"></i></div>' +
        '</div>' +
        '<div class="settings-group">' +
          '<div class="settings-group-label">Appearance</div>' +
          '<div class="settings-item"><i class="fas fa-language"></i><span class="settings-item-text">Language</span><span class="settings-item-value">English</span></div>' +
        '</div>' +
        '<div class="settings-group">' +
          '<div class="settings-group-label">Support</div>' +
          '<div class="settings-item"><i class="fas fa-circle-question"></i><span class="settings-item-text">Help Center</span><i class="fas fa-chevron-right" style="font-size:12px;color:var(--text-muted);"></i></div>' +
          '<div class="settings-item"><i class="fas fa-file-lines"></i><span class="settings-item-text">Terms of Service</span><i class="fas fa-chevron-right" style="font-size:12px;color:var(--text-muted);"></i></div>' +
          '<div class="settings-item"><i class="fas fa-shield"></i><span class="settings-item-text">Privacy Policy</span><i class="fas fa-chevron-right" style="font-size:12px;color:var(--text-muted);"></i></div>' +
        '</div>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  // Prevent background scroll when scrolling inside settings
  const body = document.getElementById('settingsBody');
  body.addEventListener('wheel', function(e) {
    const atTop = body.scrollTop === 0 && e.deltaY < 0;
    const atBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 1 && e.deltaY > 0;
    if (!atTop && !atBottom) {
      e.stopPropagation();
    }
  }, { passive: true });
}

function closeSettings() {
  const m = document.getElementById('settingsModal');
  if (m) {
    m.classList.remove('show');
    document.body.style.overflow = '';
  }
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeSettings();
    const dd = document.getElementById('userDropdown');
    if (dd) dd.classList.remove('show');
  }
});
