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
    navActions.innerHTML = `
      <div class="user-badge" onclick="toggleUserMenu()" style="cursor:pointer;">
        <div class="user-badge-avatar"><i class="fas fa-user"></i></div>
        ${displayName}
      </div>
      <div class="user-dropdown" id="userDropdown" style="display:none;position:absolute;top:calc(var(--navbar-height) - 4px);right:24px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:8px;min-width:180px;z-index:1100;box-shadow:var(--shadow-lg);">
        <div style="padding:10px 12px;border-bottom:1px solid var(--border);margin-bottom:4px;">
          <div style="font-size:14px;font-weight:600;color:#fff;">${displayName}</div>
          <div style="font-size:12px;color:var(--text-muted);">${user?.email || ''}</div>
        </div>
        <a href="pages/creator.html" style="display:flex;align-items:center;gap:8px;padding:8px 12px;font-size:13px;color:var(--text-secondary);border-radius:var(--radius-sm);text-decoration:none;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'"><i class="fas fa-film"></i> Creator Studio</a>
        <a href="pages/writer.html" style="display:flex;align-items:center;gap:8px;padding:8px 12px;font-size:13px;color:var(--text-secondary);border-radius:var(--radius-sm);text-decoration:none;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'"><i class="fas fa-pen-nib"></i> Writer Studio</a>
        <div style="height:1px;background:var(--border);margin:4px 0;"></div>
        <button onclick="logout()" style="display:flex;align-items:center;gap:8px;padding:8px 12px;font-size:13px;color:var(--error);width:100%;text-align:left;border-radius:var(--radius-sm);" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'"><i class="fas fa-right-from-bracket"></i> Log Out</button>
      </div>
    `;
  } else {
    navActions.innerHTML = `
      <a href="pages/login.html" class="btn btn-ghost">Log in</a>
      <a href="pages/signup.html" class="btn btn-primary">Get Started</a>
    `;
  }
}

function toggleUserMenu() {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) {
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('userDropdown');
  const badge = document.querySelector('.user-badge');
  if (dropdown && !dropdown.contains(e.target) && !badge?.contains(e.target)) {
    dropdown.style.display = 'none';
  }
});
