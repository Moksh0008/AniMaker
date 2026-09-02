/* =========================================================
   AniMaker — API & Authentication Layer (Supabase)
   
   Uses Supabase Auth for session management.
   Old localStorage-based tokens are replaced with
   supabaseClient.auth.getSession() / onAuthStateChange().
   ========================================================= */

const API_BASE = 'http://localhost:5000/api';

/* ---- Session helpers (Supabase-backed) ---- */

// Cached current Supabase session user
var _currentSupabaseUser = null;

async function getSession() {
  if (!supabaseClient) return null;
  try {
    const { data } = await supabaseClient.auth.getSession();
    return data.session || null;
  } catch {
    return null;
  }
}

async function getToken() {
  const session = await getSession();
  return session ? session.access_token : null;
}

function setToken() {
  // No-op — Supabase manages tokens internally
}

function removeToken() {
  // No-op — supabase.auth.signOut() handles this
}

async function getUser() {
  // Return cached user if available (fast path)
  if (_currentSupabaseUser) return formatSupabaseUser(_currentSupabaseUser);

  const session = await getSession();
  if (session && session.user) {
    _currentSupabaseUser = session.user;
    return formatSupabaseUser(session.user);
  }
  return null;
}

function setUser() {
  // No-op — Supabase manages user state internally
}

function removeUser() {
  _currentSupabaseUser = null;
}

// Format Supabase user into the shape AniMaker UI expects
function formatSupabaseUser(supabaseUser) {
  if (!supabaseUser) return null;
  const meta = supabaseUser.user_metadata || {};
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    username: meta.username || meta.preferred_username || '',
    name: meta.full_name || meta.name || '',
    bio: meta.bio || '',
    profileImage: meta.avatar_url || meta.profileImage || '',
    created_at: supabaseUser.created_at
  };
}

async function isLoggedIn() {
  const session = await getSession();
  return !!session;
}

/* ---- Safe redirect helpers ---- */

const SAFE_REDIRECT_PATHS = [
  'index.html',
  'pages/creator.html',
  'pages/writer.html',
  'pages/maker.html',
  'pages/about.html',
  'pages/services.html',
  'pages/contact.html',
  'pages/profile.html'
];

function getRedirectUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('redirect');
  if (!raw) return null;
  const decoded = decodeURIComponent(raw);
  if (/^https?:\/\//i.test(decoded)) return null;
  const cleaned = decoded.replace(/^(\.\.\/)*/, '');
  if (SAFE_REDIRECT_PATHS.includes(cleaned)) return cleaned;
  for (const safe of SAFE_REDIRECT_PATHS) {
    if (cleaned === safe || cleaned === '../' + safe) return cleaned;
  }
  return null;
}

function safeRedirect(targetPath) {
  const currentPath = window.location.pathname;
  const isOnRoot = currentPath === '/' || currentPath.endsWith('index.html');
  if (isOnRoot) {
    window.location.href = targetPath;
  } else {
    const clean = targetPath.replace(/^(\.\.\/)+/, '');
    window.location.href = clean.startsWith('pages/') ? '../' + clean : clean;
  }
}

/* ---- API request with global 401 handling ---- */

async function apiRequest(url, options = {}) {
  const token = await getToken();

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
    throw new Error('Unable to connect to server. Please check your connection.');
  }

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

  // Global 401 handling — sign out from Supabase
  if (response.status === 401) {
    removeUser();
    if (supabaseClient) {
      await supabaseClient.auth.signOut().catch(() => {});
    }
    updateNavbarAuth && updateNavbarAuth();
  }

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

/* ---- Session restoration via Supabase ---- */

async function checkAuth() {
  const session = await getSession();
  if (!session) return null;

  _currentSupabaseUser = session.user;
  return formatSupabaseUser(session.user);
}

function requireAuth() {
  return new Promise(async (resolve) => {
    const session = await getSession();
    if (!session) {
      redirectToLogin();
      return;
    }

    _currentSupabaseUser = session.user;

    const overlay = document.getElementById('authLoading');
    if (overlay) overlay.style.display = 'none';
    document.body.classList.add('auth-checked');

    resolve(formatSupabaseUser(session.user));
  });
}

function redirectToLogin() {
  const currentPath = window.location.pathname;
  const isOnRoot = currentPath === '/' || currentPath.endsWith('index.html');

  const loginUrl = isOnRoot ? 'pages/login.html' : 'login.html';

  let returnPage;
  if (isOnRoot) {
    returnPage = 'index.html';
  } else {
    const parts = currentPath.split('/');
    const filename = parts[parts.length - 1];
    returnPage = 'pages/' + filename;
  }

  window.location.href = loginUrl + '?redirect=' + encodeURIComponent(returnPage);
}

/* ---- Logout ---- */

async function logout() {
  if (supabaseClient) {
    await supabaseClient.auth.signOut().catch(() => {});
  }

  // Clear any leftover MongoDB tokens from old auth system
  localStorage.removeItem('animaker_token');
  localStorage.removeItem('animaker_user');

  _currentSupabaseUser = null;
  if (typeof clearProfileCache === 'function') clearProfileCache();
  updateNavbarAuth && updateNavbarAuth();

  const currentPath = window.location.pathname;
  const isOnRoot = currentPath === '/' || currentPath.endsWith('index.html');
  window.location.href = isOnRoot ? 'index.html' : '../index.html';
}

/* ---- Navbar auth state ---- */

async function updateNavbarAuth() {
  const navActions = document.querySelector('.nav-actions');
  if (!navActions) return;

  // On first call, check session to populate cache
  if (!_currentSupabaseUser && supabaseClient) {
    try {
      const { data } = await supabaseClient.auth.getSession();
      if (data.session && data.session.user) {
        _currentSupabaseUser = data.session.user;
      }
    } catch {}
  }

  const user = _currentSupabaseUser ? formatSupabaseUser(_currentSupabaseUser) : null;

  if (user) {
    const displayName = user.name || user.username || 'User';
    const initial = displayName.charAt(0).toUpperCase();
    const isOnRoot = window.location.pathname === '/' || window.location.pathname.endsWith('index.html');
    const prefix = isOnRoot ? 'pages/' : '';

    // Try to get avatar from profiles table
    var avatarUrl = '';
    try {
      if (supabaseClient && user.id) {
        const { data: profData } = await supabaseClient
          .from('profiles')
          .select('avatar_url, username')
          .eq('id', user.id)
          .maybeSingle();
        if (profData) {
          avatarUrl = profData.avatar_url || '';
          if (profData.username && !user.username) user.username = profData.username;
        }
      }
    } catch {}

    // Fallback to auth metadata avatar
    if (!avatarUrl) avatarUrl = user.profileImage || '';

    const avatarHtml = avatarUrl
      ? '<img src="' + avatarUrl + '" alt="' + displayName + '" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">'
      : initial;

    var profileUrl = prefix + 'profile.html';

    navActions.innerHTML =
      '<button class="nav-user-btn" id="navUserBtn">' + avatarHtml + '</button>' +
      '<div class="user-dropdown" id="userDropdown">' +
        '<div class="user-dropdown-header">' +
          '<div class="user-dropdown-avatar">' + avatarHtml + '</div>' +
          '<div class="user-dropdown-info">' +
            '<div class="user-dropdown-name">' + displayName + '</div>' +
            '<div class="user-dropdown-email">' + user.email + '</div>' +
          '</div>' +
        '</div>' +
        '<a href="' + profileUrl + '" class="user-dropdown-item"><i class="fas fa-user"></i> My Profile</a>' +
        '<a href="' + prefix + 'creator.html" class="user-dropdown-item"><i class="fas fa-film"></i> Creator Studio</a>' +
        '<a href="' + prefix + 'writer.html" class="user-dropdown-item"><i class="fas fa-pen-nib"></i> Writer Studio</a>' +
        '<a href="' + prefix + 'maker.html" class="user-dropdown-item"><i class="fas fa-cube"></i> Maker Studio</a>' +
        '<div class="user-dropdown-divider"></div>' +
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

/* ---- Auth state change listener ---- */

if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange(function(event, session) {
    if (event === 'SIGNED_IN' && session && session.user) {
      _currentSupabaseUser = session.user;
      // Ensure profile exists (safety net for Google users)
      ensureProfileExists(session.user);
      updateNavbarAuth();
    } else if (event === 'SIGNED_OUT') {
      _currentSupabaseUser = null;
      localStorage.removeItem('animaker_token');
      localStorage.removeItem('animaker_user');
      if (typeof clearProfileCache === 'function') clearProfileCache();
      updateNavbarAuth();
    } else if (event === 'TOKEN_REFRESHED' && session && session.user) {
      _currentSupabaseUser = session.user;
    }
  });
}

/* Ensure a profile row exists for the user (safety net for Google OAuth) */
async function ensureProfileExists(user) {
  if (!supabaseClient || !user) return;
  try {
    const { data } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    if (!data) {
      // Profile doesn't exist — create it from auth metadata
      const meta = user.user_metadata || {};
      var username = meta.username || meta.preferred_username || user.email.split('@')[0];
      var fullName = meta.full_name || meta.name || '';
      var avatarUrl = meta.avatar_url || meta.profileImage || '';
      await supabaseClient.from('profiles').insert({
        id: user.id,
        username: username,
        full_name: fullName,
        email: user.email,
        avatar_url: avatarUrl
      });
    }
  } catch {}
}

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
