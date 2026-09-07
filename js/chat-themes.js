/* =========================================================
   AniMaker v2.1 — Chat Themes (per-conversation)
   
   Each user can customize the appearance of each conversation
   independently. Themes are stored per user + conversation.
   ========================================================= */

var CHAT_THEMES = {
  default:   { name: 'Default',   accent: '#7c5cfc', bg: '',          bubbleBg: '#7c5cfc', bubbleStyle: 'rounded' },
  midnight:  { name: 'Midnight',  accent: '#1e293b', bg: '#020617',   bubbleBg: '#1e293b', bubbleStyle: 'rounded' },
  purple:    { name: 'Purple',    accent: '#8b5cf6', bg: '#1a0e2e',   bubbleBg: '#8b5cf6', bubbleStyle: 'rounded' },
  ocean:     { name: 'Ocean',     accent: '#0ea5e9', bg: '#0c1929',   bubbleBg: '#0ea5e9', bubbleStyle: 'rounded' },
  sakura:    { name: 'Sakura',    accent: '#ec4899', bg: '#1a0e1e',   bubbleBg: '#ec4899', bubbleStyle: 'rounded' },
  neon:      { name: 'Neon',      accent: '#22d3ee', bg: '#0a0a0f',   bubbleBg: '#22d3ee', bubbleStyle: 'glass' },
  sunset:    { name: 'Sunset',    accent: '#f97316', bg: '#1a0e0a',   bubbleBg: '#f97316', bubbleStyle: 'rounded' },
  anime:     { name: 'Anime',     accent: '#a855f7', bg: '#0f0a1a',   bubbleBg: '#7c3aed', bubbleStyle: 'rounded' },
  green:     { name: 'Green',     accent: '#10b981', bg: '#0a1a14',   bubbleBg: '#10b981', bubbleStyle: 'rounded' },
  red:       { name: 'Red',       accent: '#ef4444', bg: '#1a0a0a',   bubbleBg: '#ef4444', bubbleStyle: 'rounded' },
  blue:      { name: 'Blue',      accent: '#3b82f6', bg: '#0a0e1a',   bubbleBg: '#3b82f6', bubbleStyle: 'rounded' },
  pink:      { name: 'Pink',      accent: '#ec4899', bg: '#1a0e14',   bubbleBg: '#ec4899', bubbleStyle: 'rounded' },
  light:     { name: 'Light',     accent: '#6366f1', bg: '#f8fafc',   bubbleBg: '#6366f1', bubbleStyle: 'rounded' },
  glass:     { name: 'Glass',     accent: '#7c5cfc', bg: '',          bubbleBg: 'rgba(124,92,252,0.2)', bubbleStyle: 'glass' },
  minimal:   { name: 'Minimal',   accent: '#9896a8', bg: '',          bubbleBg: 'transparent', bubbleStyle: 'minimal' },
  amoled:    { name: 'AMOLED',    accent: '#7c5cfc', bg: '#000000',   bubbleBg: '#111111', bubbleStyle: 'rounded' }
};

var _chatCurrentTheme = null;

/* =========================================================
   APPLY THEME TO CHAT AREA
   ========================================================= */

function chatApplyTheme(themeName, accentColor, bubbleStyle) {
  var chatMain = document.getElementById('chatMain');
  if (!chatMain) return;

  var theme = CHAT_THEMES[themeName] || CHAT_THEMES['default'];

  // Set data-theme attribute for CSS
  chatMain.setAttribute('data-theme', themeName);

  // Apply custom accent color via CSS variables scoped to chat-main
  if (accentColor) {
    chatMain.style.setProperty('--chat-accent', accentColor);
  } else {
    chatMain.style.setProperty('--chat-accent', theme.accent);
  }

  // Apply bubble style
  var bs = bubbleStyle || theme.bubbleStyle;
  window._chatCurrentTheme = {
    theme: themeName,
    accent_color: accentColor || theme.accent,
    bubble_style: bs
  };

  // Update bubble classes on existing messages
  chatRefreshMessages();
}

/* =========================================================
   THEME PICKER
   ========================================================= */

function chatOpenThemePicker() {
  var existing = document.getElementById('chatThemeModal');
  if (existing) existing.remove();

  var currentThemeName = 'default';
  if (_chatCurrentTheme) currentThemeName = _chatCurrentTheme.theme || 'default';

  var overlay = document.createElement('div');
  overlay.id = 'chatThemeModal';
  overlay.className = 'chat-new-modal-overlay';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  var themeGridHtml = '';
  var themeKeys = Object.keys(CHAT_THEMES);
  for (var i = 0; i < themeKeys.length; i++) {
    var key = themeKeys[i];
    var t = CHAT_THEMES[key];
    var isActive = key === currentThemeName;
    var swatchStyle = 'background:' + (t.bubbleBg || t.accent) + ';';
    if (key === 'glass') swatchStyle = 'background:rgba(124,92,252,0.3);border-style:dashed;';
    if (key === 'minimal') swatchStyle = 'background:transparent;border-color:var(--text-muted);';
    if (key === 'light') swatchStyle = 'background:#6366f1;';

    themeGridHtml += '<button class="chat-theme-option' + (isActive ? ' active' : '') + '" data-theme-key="' + key + '" onclick="chatSelectTheme(\'' + key + '\')">' +
      '<div class="chat-theme-swatch" style="' + swatchStyle + '"></div>' +
      '<div class="chat-theme-label">' + t.name + '</div>' +
    '</button>';
  }

  overlay.innerHTML =
    '<div class="chat-new-modal" style="max-width:480px;">' +
      '<div class="chat-new-modal-header">' +
        '<h3>Chat Theme</h3>' +
        '<button class="chat-new-modal-close" onclick="this.closest(\'.chat-new-modal-overlay\').remove()"><i class="fas fa-xmark"></i></button>' +
      '</div>' +
      '<div style="padding:20px;">' +
        /* Preview */
        '<div id="chatThemePreview" class="chat-theme-preview" style="background:var(--bg-tertiary);border-radius:16px;padding:16px;margin-bottom:20px;border:1px solid var(--border);">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">' +
            '<div style="width:32px;height:32px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px;">J</div>' +
            '<div><div style="color:#fff;font-weight:600;font-size:13px;">Jashu</div><div style="color:var(--text-muted);font-size:11px;">Online</div></div>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:8px;">' +
            '<div style="display:flex;"><div class="chat-msg-bubble rounded" style="background:var(--bg-tertiary);color:var(--text-primary);padding:8px 14px;border-radius:18px 18px 18px 4px;font-size:13px;border:1px solid var(--border);">Hello bro 🔥</div></div>' +
            '<div style="display:flex;justify-content:flex-end;"><div id="previewSentBubble" class="chat-msg-bubble rounded" style="background:var(--accent);color:#fff;padding:8px 14px;border-radius:18px 18px 4px 18px;font-size:13px;">Hey! ❤️</div></div>' +
          '</div>' +
        '</div>' +
        /* Theme grid */
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px;">' +
          themeGridHtml +
        '</div>' +
        /* Custom accent color */
        '<div style="margin-bottom:16px;">' +
          '<label style="font-size:13px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:8px;">Accent Color</label>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;" id="chatAccentColors">' +
            '<button onclick="chatSelectAccent(\'#7c5cfc\')" style="width:32px;height:32px;border-radius:50%;background:#7c5cfc;border:2px solid transparent;cursor:pointer;" data-color="#7c5cfc"></button>' +
            '<button onclick="chatSelectAccent(\'#8b5cf6\')" style="width:32px;height:32px;border-radius:50%;background:#8b5cf6;border:2px solid transparent;cursor:pointer;" data-color="#8b5cf6"></button>' +
            '<button onclick="chatSelectAccent(\'#ec4899\')" style="width:32px;height:32px;border-radius:50%;background:#ec4899;border:2px solid transparent;cursor:pointer;" data-color="#ec4899"></button>' +
            '<button onclick="chatSelectAccent(\'#ef4444\')" style="width:32px;height:32px;border-radius:50%;background:#ef4444;border:2px solid transparent;cursor:pointer;" data-color="#ef4444"></button>' +
            '<button onclick="chatSelectAccent(\'#f97316\')" style="width:32px;height:32px;border-radius:50%;background:#f97316;border:2px solid transparent;cursor:pointer;" data-color="#f97316"></button>' +
            '<button onclick="chatSelectAccent(\'#eab308\')" style="width:32px;height:32px;border-radius:50%;background:#eab308;border:2px solid transparent;cursor:pointer;" data-color="#eab308"></button>' +
            '<button onclick="chatSelectAccent(\'#10b981\')" style="width:32px;height:32px;border-radius:50%;background:#10b981;border:2px solid transparent;cursor:pointer;" data-color="#10b981"></button>' +
            '<button onclick="chatSelectAccent(\'#0ea5e9\')" style="width:32px;height:32px;border-radius:50%;background:#0ea5e9;border:2px solid transparent;cursor:pointer;" data-color="#0ea5e9"></button>' +
            '<button onclick="chatSelectAccent(\'#22d3ee\')" style="width:32px;height:32px;border-radius:50%;background:#22d3ee;border:2px solid transparent;cursor:pointer;" data-color="#22d3ee"></button>' +
            '<button onclick="chatSelectAccent(\'#f43f5e\')" style="width:32px;height:32px;border-radius:50%;background:#f43f5e;border:2px solid transparent;cursor:pointer;" data-color="#f43f5e"></button>' +
          '</div>' +
        '</div>' +
        /* Bubble style */
        '<div style="margin-bottom:20px;">' +
          '<label style="font-size:13px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:8px;">Bubble Style</label>' +
          '<div style="display:flex;gap:8px;">' +
            '<button class="chat-bubble-style-btn active" data-bs="rounded" onclick="chatSelectBubbleStyle(\'rounded\', this)" style="padding:6px 14px;border-radius:var(--radius-full);background:var(--accent-muted);border:1px solid var(--accent);color:var(--accent);font-size:12px;font-weight:600;cursor:pointer;">Rounded</button>' +
            '<button class="chat-bubble-style-btn" data-bs="glass" onclick="chatSelectBubbleStyle(\'glass\', this)" style="padding:6px 14px;border-radius:var(--radius-full);background:var(--bg-tertiary);border:1px solid var(--border);color:var(--text-secondary);font-size:12px;font-weight:600;cursor:pointer;">Glass</button>' +
            '<button class="chat-bubble-style-btn" data-bs="minimal" onclick="chatSelectBubbleStyle(\'minimal\', this)" style="padding:6px 14px;border-radius:var(--radius-full);background:var(--bg-tertiary);border:1px solid var(--border);color:var(--text-secondary);font-size:12px;font-weight:600;cursor:pointer;">Minimal</button>' +
          '</div>' +
        '</div>' +
        /* Save / Cancel */
        '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
          '<button onclick="this.closest(\'.chat-new-modal-overlay\').remove()" style="padding:8px 20px;border-radius:var(--radius-full);background:var(--bg-tertiary);border:1px solid var(--border);color:var(--text-secondary);font-size:13px;font-weight:600;cursor:pointer;">Cancel</button>' +
          '<button onclick="chatSaveTheme()" style="padding:8px 20px;border-radius:var(--radius-full);background:var(--accent);border:none;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">Save</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);

  // Store current selection state
  window._chatThemeSelection = {
    theme: currentThemeName,
    accent: (_chatCurrentTheme && _chatCurrentTheme.accent_color) || CHAT_THEMES[currentThemeName].accent,
    bubble: (_chatCurrentTheme && _chatCurrentTheme.bubble_style) || CHAT_THEMES[currentThemeName].bubbleStyle
  };
}

function chatSelectTheme(themeName) {
  window._chatThemeSelection.theme = themeName;

  var theme = CHAT_THEMES[themeName] || CHAT_THEMES['default'];
  window._chatThemeSelection.accent = theme.accent;
  window._chatThemeSelection.bubble = theme.bubbleStyle;

  // Update active states
  var options = document.querySelectorAll('.chat-theme-option');
  for (var i = 0; i < options.length; i++) {
    options[i].classList.toggle('active', options[i].dataset.themeKey === themeName);
  }

  // Update preview
  chatUpdateThemePreview();
}

function chatSelectAccent(color) {
  window._chatThemeSelection.accent = color;

  // Update active color
  var btns = document.querySelectorAll('#chatAccentColors button');
  for (var i = 0; i < btns.length; i++) {
    btns[i].style.borderColor = btns[i].dataset.color === color ? '#fff' : 'transparent';
  }

  chatUpdateThemePreview();
}

function chatSelectBubbleStyle(style, btn) {
  window._chatThemeSelection.bubble = style;

  var btns = document.querySelectorAll('.chat-bubble-style-btn');
  for (var i = 0; i < btns.length; i++) {
    btns[i].style.background = btns[i] === btn ? 'var(--accent-muted)' : 'var(--bg-tertiary)';
    btns[i].style.borderColor = btns[i] === btn ? 'var(--accent)' : 'var(--border)';
    btns[i].style.color = btns[i] === btn ? 'var(--accent)' : 'var(--text-secondary)';
  }

  chatUpdateThemePreview();
}

function chatUpdateThemePreview() {
  var sel = window._chatThemeSelection;
  var theme = CHAT_THEMES[sel.theme] || CHAT_THEMES['default'];
  var preview = document.getElementById('chatThemePreview');
  var sentBubble = document.getElementById('previewSentBubble');
  if (preview) {
    preview.style.background = theme.bg || 'var(--bg-tertiary)';
  }
  if (sentBubble) {
    sentBubble.style.background = sel.accent;
    sentBubble.className = 'chat-msg-bubble ' + sel.bubble;
  }
}

async function chatSaveTheme() {
  if (!_chatCurrentConv) return;
  var sel = window._chatThemeSelection;

  try {
    await chatSavePreference(_chatCurrentConv.id, {
      theme: sel.theme,
      accent_color: sel.accent,
      bubble_style: sel.bubble
    });

    chatApplyTheme(sel.theme, sel.accent, sel.bubble);

    var modal = document.getElementById('chatThemeModal');
    if (modal) modal.remove();

    showToast('Theme updated!', 'success');
  } catch (e) {
    showToast(e.message || 'Failed to save theme', 'error');
  }
}

/* =========================================================
   LOAD THEME FOR CONVERSATION
   ========================================================= */

async function chatLoadConversationTheme(conversationId) {
  try {
    var pref = await chatGetPreference(conversationId);
    if (pref) {
      chatApplyTheme(pref.theme, pref.accent_color, pref.bubble_style);
    } else {
      chatApplyTheme('default');
    }
  } catch (e) {
    chatApplyTheme('default');
  }
}
