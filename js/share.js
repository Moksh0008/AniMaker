/* =========================================================
   AniMaker — Share System
   Share sheet for Creator images, Writer stories, Maker videos.
   - Copy Link / Native Share / WhatsApp / X / Facebook / LinkedIn / Email
   - Share in AniMaker Chat (sends a reference card message)
   - Records share_events for analytics (logged-in users)
   - Deep links: <page>?creation=ID opens the creation detail view
   ========================================================= */

var _shareCtx = null;          // { creation, count }
var _sharePrevFocus = null;
var _shareChatSelection = [];  // selected profile ids for chat sharing
var _shareChatUsers = {};      // id -> profile cache

/* ---- Small helpers ---- */
function shareToast(msg, type) {
  if (typeof window.showToast === 'function') { window.showToast(msg, type || 'info'); return; }
  var t = document.createElement('div');
  t.className = 'share-fallback-toast ' + (type || 'info');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() { t.classList.add('show'); }, 10);
  setTimeout(function() { t.classList.remove('show'); setTimeout(function() { t.remove(); }, 300); }, 2600);
}

function shareResolveUrl(url) {
  if (!url) return '';
  if (typeof resolveAssetUrl === 'function') { try { return resolveAssetUrl(url); } catch (e) {} }
  if (/^https?:\/\//i.test(url)) return url;
  var a = document.createElement('a');
  a.href = url;
  return a.href;
}

/* ---- Canonical share URL for a creation ---- */
function getCreationShareUrl(creation) {
  if (!creation || !creation.id) return window.location.href;
  var origin = window.location.origin;
  if (!origin || origin === 'null') {
    // file:// or unusual context — fall back to current page URL
    return window.location.href.split('?')[0] + '?creation=' + encodeURIComponent(creation.id);
  }
  var path = creation.type === 'writer' ? '/pages/writer.html'
           : creation.type === 'maker' ? '/pages/maker.html'
           : '/pages/creator.html';
  return origin + path + '?creation=' + encodeURIComponent(creation.id);
}

function shareCreationTypeLabel(creation) {
  if (!creation || !creation.type) return 'Creation';
  return creation.type.charAt(0).toUpperCase() + creation.type.slice(1);
}

function shareTextFor(creation) {
  var profile = (creation && creation.profiles) || {};
  var username = profile.username || 'AniMaker';
  var title = creation && creation.title ? creation.title : 'a creation';
  return 'Check out "' + title + '" by @' + username + ' on AniMaker';
}

/* ---- Share count ---- */
async function getShareCount(creationId) {
  if (!window.supabaseClient || !creationId) return 0;
  try {
    var res = await supabaseClient
      .from('share_events')
      .select('id', { count: 'exact', head: true })
      .eq('creation_id', creationId);
    if (!res.error && typeof res.count === 'number') return res.count;
  } catch (e) { /* table not migrated yet */ }
  return 0;
}

async function recordShare(creationId, platform) {
  if (!window.supabaseClient || !creationId) return;
  try {
    var session = typeof getSession === 'function' ? await getSession() : null;
    var row = { creation_id: creationId, platform: platform };
    if (session && session.user) row.user_id = session.user.id;
    await supabaseClient.from('share_events').insert(row);
  } catch (e) { /* analytics is best-effort; never block the share */ }
}

/* ---- Share sheet ---- */
async function openShareSheet(creationId) {
  if (!creationId) return;
  var overlay = document.getElementById('shareOverlay');

  // Optimistic sheet with skeleton while fetching
  if (!overlay) { overlay = buildShareSheetDom(); }

  var preview = overlay.querySelector('.share-preview');
  preview.innerHTML = '<div class="share-preview-thumb share-preview-skeleton"></div>' +
    '<div class="share-preview-info"><div class="share-preview-title share-preview-skeleton" style="height:14px;"></div>' +
    '<div class="share-preview-byline share-preview-skeleton" style="height:11px;width:120px;"></div></div>';

  var creation = null;
  if (typeof window.fetchCreation === 'function') {
    try { creation = await window.fetchCreation(creationId); } catch (e) { creation = null; }
  }

  overlay.style.display = 'flex';
  requestAnimationFrame(function() { overlay.classList.add('open'); });
  _sharePrevFocus = document.activeElement;

  if (!creation) {
    creation = { id: creationId, type: 'creator', title: 'AniMaker Creation' };
    preview.innerHTML = '<div class="share-preview-thumb"><i class="fas fa-cube"></i></div>' +
      '<div class="share-preview-info"><div class="share-preview-title">AniMaker Creation</div>' +
      '<div class="share-preview-byline">Could not load preview</div></div>';
  } else {
    renderSharePreview(overlay, creation);
  }

  var count = await getShareCount(creationId);
  _shareCtx = { creation: creation, count: count };
  updateShareCountLabel();

  // "Share in AniMaker" visibility depends on login state
  var chatBtn = overlay.querySelector('[data-share-platform="animaker-chat"]');
  if (chatBtn) {
    var session = null;
    if (typeof getSession === 'function') { try { session = await getSession(); } catch (e) {} }
    chatBtn.style.display = (session && session.user) ? '' : 'none';
  }
  var nativeBtn = overlay.querySelector('[data-share-platform="native"]');
  if (nativeBtn) nativeBtn.style.display = (navigator.share) ? '' : 'none';

  var firstBtn = overlay.querySelector('.share-option');
  if (firstBtn) firstBtn.focus();
}

function buildShareSheetDom() {
  var overlay = document.createElement('div');
  overlay.className = 'share-overlay';
  overlay.id = 'shareOverlay';
  overlay.innerHTML =
    '<div class="share-sheet" role="dialog" aria-modal="true" aria-label="Share creation">' +
      '<button class="share-sheet-close" onclick="closeShareSheet()" aria-label="Close share menu"><i class="fas fa-xmark"></i></button>' +
      '<h3 class="share-sheet-title"><i class="fas fa-share-nodes"></i> Share</h3>' +
      '<div class="share-preview"></div>' +
      '<div class="share-count-line" id="shareCountLine"><i class="fas fa-share-nodes"></i> <span id="shareCountValue">0</span> shares</div>' +
      '<div class="share-grid" id="shareGrid">' +
        '<button class="share-option" data-share-platform="copy" aria-label="Copy link">' +
          '<span class="share-option-icon copy"><i class="fas fa-link"></i></span><span class="share-option-label">Copy Link</span>' +
        '</button>' +
        '<button class="share-option" data-share-platform="animaker-chat" aria-label="Share in AniMaker chat">' +
          '<span class="share-option-icon animaker"><i class="fas fa-paper-plane"></i></span><span class="share-option-label">AniMaker</span>' +
        '</button>' +
        '<button class="share-option" data-share-platform="whatsapp" aria-label="Share on WhatsApp">' +
          '<span class="share-option-icon whatsapp"><i class="fab fa-whatsapp"></i></span><span class="share-option-label">WhatsApp</span>' +
        '</button>' +
        '<button class="share-option" data-share-platform="twitter" aria-label="Share on X">' +
          '<span class="share-option-icon twitter"><i class="fab fa-x-twitter"></i></span><span class="share-option-label">X</span>' +
        '</button>' +
        '<button class="share-option" data-share-platform="facebook" aria-label="Share on Facebook">' +
          '<span class="share-option-icon facebook"><i class="fab fa-facebook-f"></i></span><span class="share-option-label">Facebook</span>' +
        '</button>' +
        '<button class="share-option" data-share-platform="linkedin" aria-label="Share on LinkedIn">' +
          '<span class="share-option-icon linkedin"><i class="fab fa-linkedin-in"></i></span><span class="share-option-label">LinkedIn</span>' +
        '</button>' +
        '<button class="share-option" data-share-platform="email" aria-label="Share via Email">' +
          '<span class="share-option-icon email"><i class="fas fa-envelope"></i></span><span class="share-option-label">Email</span>' +
        '</button>' +
        '<button class="share-option" data-share-platform="native" aria-label="More sharing options">' +
          '<span class="share-option-icon more"><i class="fas fa-ellipsis"></i></span><span class="share-option-label">More</span>' +
        '</button>' +
      '</div>' +
      '<div class="share-chat-panel" id="shareChatPanel" style="display:none;"></div>' +
    '</div>';

  overlay.addEventListener('click', function(e) { if (e.target === overlay) closeShareSheet(); });
  overlay.querySelector('#shareGrid').addEventListener('click', function(e) {
    var btn = e.target.closest('.share-option');
    if (btn) handleShareAction(btn.getAttribute('data-share-platform'));
  });
  document.addEventListener('keydown', shareEscapeHandler);
  document.body.appendChild(overlay);
  return overlay;
}

function shareEscapeHandler(e) {
  var overlay = document.getElementById('shareOverlay');
  if (overlay && overlay.style.display !== 'none' && e.key === 'Escape') closeShareSheet();
}

function renderSharePreview(overlay, creation) {
  var profile = creation.profiles || (typeof getDefaultUser === 'function' ? getDefaultUser(creation) : null) || {};
  var username = profile.username || 'AniMaker';
  var thumbUrl = creation.cover_image_url || creation.thumbnail_url || (creation.type !== 'writer' ? creation.media_url : '');
  var thumbInner;
  if (thumbUrl) {
    thumbInner = '<img src="' + shareResolveUrl(thumbUrl) + '" alt="" loading="lazy">';
  } else {
    var icon = creation.type === 'writer' ? 'fa-pen-nib' : creation.type === 'maker' ? 'fa-video' : 'fa-image';
    thumbInner = '<i class="fas ' + icon + '"></i>';
  }
  var preview = overlay.querySelector('.share-preview');
  preview.innerHTML =
    '<div class="share-preview-thumb">' + thumbInner + '</div>' +
    '<div class="share-preview-info">' +
      '<div class="share-preview-title">' + postEscapeHtmlSafe(creation.title || 'Untitled') + '</div>' +
      '<div class="share-preview-byline">@' + postEscapeHtmlSafe(username) + ' · ' + shareCreationTypeLabel(creation) + '</div>' +
    '</div>';
}

function postEscapeHtmlSafe(str) {
  if (typeof postEscapeHtml === 'function') return postEscapeHtml(str);
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function updateShareCountLabel() {
  var el = document.getElementById('shareCountValue');
  if (el && _shareCtx) el.textContent = String(_shareCtx.count);
}

function closeShareSheet() {
  var overlay = document.getElementById('shareOverlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  setTimeout(function() { overlay.style.display = 'none'; }, 200);
  var panel = document.getElementById('shareChatPanel');
  if (panel) { panel.style.display = 'none'; panel.innerHTML = ''; }
  _shareChatSelection = [];
  _shareChatUsers = {};
  if (_sharePrevFocus && typeof _sharePrevFocus.focus === 'function') { try { _sharePrevFocus.focus(); } catch (e) {} }
  _sharePrevFocus = null;
}

/* ---- Actions ---- */
async function handleShareAction(platform) {
  if (!_shareCtx) return;
  var creation = _shareCtx.creation;
  var url = getCreationShareUrl(creation);
  var text = shareTextFor(creation);
  var title = creation.title || 'AniMaker Creation';

  if (platform === 'copy') {
    var ok = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url); ok = true;
      }
    } catch (e) { ok = false; }
    if (!ok) {
      var ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      ta.remove();
    }
    shareToast(ok ? 'Link copied!' : 'Could not copy link', ok ? 'success' : 'error');
    if (ok) countThisShare('copy');
    closeShareSheet();
    return;
  }

  if (platform === 'animaker-chat') { openShareChatPanel(); return; }

  if (platform === 'native') {
    if (navigator.share) {
      try {
        await navigator.share({ title: title, text: text, url: url });
        countThisShare('native');
      } catch (e) { /* user cancelled */ }
    } else {
      shareToast('Native sharing is not supported on this browser', 'info');
    }
    return;
  }

  var shareUrls = {
    whatsapp: 'https://wa.me/?text=' + encodeURIComponent(text + ' ' + url),
    twitter: 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url),
    facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url),
    linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url),
    email: 'mailto:?subject=' + encodeURIComponent(title + ' — AniMaker') + '&body=' + encodeURIComponent(text + '\n\n' + url)
  };
  var target = shareUrls[platform];
  if (!target) return;
  window.open(target, '_blank', 'noopener,noreferrer');
  countThisShare(platform);
}

function countThisShare(platform) {
  if (!_shareCtx) return;
  _shareCtx.count += 1;
  updateShareCountLabel();
  recordShare(_shareCtx.creation.id, platform);
}

/* ---- Share in AniMaker Chat ---- */
function openShareChatPanel() {
  var overlay = document.getElementById('shareOverlay');
  var panel = document.getElementById('shareChatPanel');
  if (!overlay || !panel || !_shareCtx) return;

  panel.innerHTML =
    '<div class="share-chat-header">' +
      '<button class="share-chat-back" onclick="closeShareChatPanel()" aria-label="Back to share options"><i class="fas fa-arrow-left"></i></button>' +
      '<span>Send in AniMaker Chat</span>' +
    '</div>' +
    '<div class="share-chat-search-wrap">' +
      '<i class="fas fa-magnifying-glass"></i>' +
      '<input type="text" id="shareChatSearch" placeholder="Search users by name..." aria-label="Search users" autocomplete="off">' +
    '</div>' +
    '<div class="share-chat-selected" id="shareChatSelected"></div>' +
    '<div class="share-chat-results" id="shareChatResults"><div class="share-chat-loading"><i class="fas fa-spinner fa-spin"></i> Loading…</div></div>' +
    '<button class="share-chat-send" id="shareChatSend" onclick="sendSharedCreationToChats()" disabled>' +
      '<i class="fas fa-paper-plane"></i> <span>Send</span>' +
    '</button>';

  panel.style.display = 'flex';
  overlay.querySelector('#shareGrid').style.display = 'none';
  overlay.querySelector('.share-count-line').style.display = 'none';

  var input = panel.querySelector('#shareChatSearch');
  var debounce = null;
  input.addEventListener('input', function() {
    clearTimeout(debounce);
    var q = input.value.trim();
    debounce = setTimeout(function() { searchShareChatUsers(q); }, 250);
  });
  input.focus();

  loadRecentShareChats();
}

function closeShareChatPanel() {
  var overlay = document.getElementById('shareOverlay');
  var panel = document.getElementById('shareChatPanel');
  if (!overlay || !panel) return;
  panel.style.display = 'none';
  panel.innerHTML = '';
  _shareChatSelection = [];
  overlay.querySelector('#shareGrid').style.display = '';
  overlay.querySelector('.share-count-line').style.display = '';
}

function renderShareChatSelection() {
  var wrap = document.getElementById('shareChatSelected');
  if (!wrap) return;
  if (_shareChatSelection.length === 0) { wrap.innerHTML = ''; wrap.style.display = 'none'; return; }
  wrap.style.display = 'flex';
  wrap.innerHTML = _shareChatSelection.map(function(id) {
    var p = _shareChatUsers[id] || {};
    return '<span class="share-chat-chip">' + postEscapeHtmlSafe(p.username || 'User') +
      '<button onclick="toggleShareChatUser(\'' + id + '\')" aria-label="Remove ' + postEscapeHtmlSafe(p.username || 'user') + '"><i class="fas fa-xmark"></i></button></span>';
  }).join('');
  var sendBtn = document.getElementById('shareChatSend');
  if (sendBtn) {
    sendBtn.disabled = _shareChatSelection.length === 0;
    sendBtn.querySelector('span').textContent = 'Send' + (_shareChatSelection.length > 1 ? ' to ' + _shareChatSelection.length : '');
  }
}

function toggleShareChatUser(profileId) {
  var idx = _shareChatSelection.indexOf(profileId);
  if (idx >= 0) _shareChatSelection.splice(idx, 1);
  else _shareChatSelection.push(profileId);
  renderShareChatSelection();
  highlightShareChatRows();
}

function highlightShareChatRows() {
  document.querySelectorAll('.share-chat-user').forEach(function(row) {
    var selected = _shareChatSelection.indexOf(row.getAttribute('data-user-id')) >= 0;
    row.classList.toggle('selected', selected);
  });
}

async function loadRecentShareChats() {
  if (!window.supabaseClient) { searchShareChatUsers(''); return; }
  try {
    var session = typeof getSession === 'function' ? await getSession() : null;
    if (!session || !session.user) { searchShareChatUsers(''); return; }
    var me = session.user.id;

    var mine = await supabaseClient.from('conversation_participants').select('conversation_id').eq('user_id', me);
    if (mine.error || !mine.data || mine.data.length === 0) { searchShareChatUsers(''); return; }
    var convIds = mine.data.map(function(r) { return r.conversation_id; });

    var others = await supabaseClient
      .from('conversation_participants')
      .select('user_id, profiles(username, full_name, avatar_url)')
      .in('conversation_id', convIds)
      .neq('user_id', me);
    if (others.error || !others.data) { searchShareChatUsers(''); return; }

    var seen = {};
    var users = [];
    others.data.forEach(function(r) {
      if (seen[r.user_id] || !r.profiles) return;
      seen[r.user_id] = true;
      users.push({ id: r.user_id, username: r.profiles.username, full_name: r.profiles.full_name, avatar_url: r.profiles.avatar_url });
    });
    if (users.length === 0) { searchShareChatUsers(''); return; }

    _shareChatUsers = users.reduce(function(acc, u) { acc[u.id] = u; return acc; }, _shareChatUsers);
    var results = document.getElementById('shareChatResults');
    if (results && document.getElementById('shareChatSearch').value.trim() === '') {
      results.innerHTML = '<div class="share-chat-section-label">Recent chats</div>' + users.map(renderShareChatUserRow).join('');
      highlightShareChatRows();
    }
  } catch (e) { /* recents unavailable — search still works */ }
}

async function searchShareChatUsers(query) {
  var results = document.getElementById('shareChatResults');
  if (!results) return;
  if (!window.supabaseClient) {
    results.innerHTML = '<div class="share-chat-empty">Chat is unavailable right now.</div>';
    return;
  }
  try {
    var q = supabaseClient.from('profiles').select('id, username, full_name, avatar_url').limit(12);
    if (query) q = q.or('username.ilike.%' + query + '%,full_name.ilike.%' + query + '%');
    var res = await q;
    if (res.error) throw new Error(res.error.message);

    var session = typeof getSession === 'function' ? await getSession() : null;
    var meId = session && session.user ? session.user.id : null;

    var users = (res.data || []).filter(function(p) {
      return p.id !== meId && String(p.id).indexOf('default-') !== 0;
    });
    users.forEach(function(u) { _shareChatUsers[u.id] = u; });

    if (users.length === 0) {
      results.innerHTML = '<div class="share-chat-empty">No users found</div>';
      return;
    }
    results.innerHTML = '<div class="share-chat-section-label">' + (query ? 'Results' : 'Suggested users') + '</div>' +
      users.map(renderShareChatUserRow).join('');
    highlightShareChatRows();
  } catch (e) {
    results.innerHTML = '<div class="share-chat-empty">Could not load users</div>';
  }
}

function shareAvatarHtml(p, size) {
  var s = size || 36;
  if (p.avatar_url) {
    return '<img src="' + shareResolveUrl(p.avatar_url) + '" alt="" style="width:' + s + 'px;height:' + s + 'px;border-radius:50%;object-fit:cover;flex-shrink:0;">';
  }
  var initial = ((p.username || p.full_name || 'U').charAt(0) || 'U').toUpperCase();
  return '<span style="width:' + s + 'px;height:' + s + 'px;border-radius:50%;background:var(--accent);display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:' + Math.round(s * 0.42) + 'px;flex-shrink:0;">' + initial + '</span>';
}

function renderShareChatUserRow(p) {
  return '<div class="share-chat-user" data-user-id="' + p.id + '" onclick="toggleShareChatUser(\'' + p.id + '\')" role="checkbox" aria-checked="false" tabindex="0" ' +
      'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();toggleShareChatUser(\'' + p.id + '\')}">' +
    shareAvatarHtml(p, 36) +
    '<div class="share-chat-user-info">' +
      '<div class="share-chat-user-name">' + postEscapeHtmlSafe(p.username || 'User') + '</div>' +
      (p.full_name ? '<div class="share-chat-user-full">' + postEscapeHtmlSafe(p.full_name) + '</div>' : '') +
    '</div>' +
    '<i class="fas fa-circle-check share-chat-check"></i>' +
  '</div>';
}

/* ---- Message payload for shared creations ---- */
var SHARE_MSG_SENTINEL = '__ANIMAKER_SHARE__';

function buildSharedCreationContent(creation, profile) {
  var thumb = creation.cover_image_url || creation.thumbnail_url || (creation.type !== 'writer' ? creation.media_url : '');
  return SHARE_MSG_SENTINEL + JSON.stringify({
    id: creation.id,
    type: creation.type || 'creator',
    t: creation.title || 'Untitled',
    u: (profile && profile.username) || 'AniMaker',
    d: (creation.description || '').slice(0, 140),
    img: shareResolveUrl(thumb)
  });
}

async function sendSharedCreationToChats() {
  if (!window.supabaseClient || _shareChatSelection.length === 0) return;
  if (!_shareCtx) return;

  var sendBtn = document.getElementById('shareChatSend');
  if (sendBtn) { sendBtn.disabled = true; sendBtn.querySelector('span').textContent = 'Sending…'; }

  var creation = _shareCtx.creation;
  var profile = creation.profiles || (typeof getDefaultUser === 'function' ? getDefaultUser(creation) : null) || {};
  var content = buildSharedCreationContent(creation, profile);

  var successCount = 0;
  var failCount = 0;

  for (var i = 0; i < _shareChatSelection.length; i++) {
    var userId = _shareChatSelection[i];
    try {
      var convRes = await supabaseClient.rpc('chat_start_conversation', { p_other_user_id: userId });
      if (convRes.error) throw new Error(convRes.error.message);
      var convId = convRes.data;

      var msgRes = await supabaseClient.rpc('chat_send_message', {
        p_conversation_id: convId,
        p_content: content,
        p_reply_to: null
      });
      if (msgRes.error) throw new Error(msgRes.error.message);
      successCount++;
    } catch (e) {
      failCount++;
      console.error('[Share] send to chat failed:', e.message);
    }
  }

  if (successCount > 0) {
    countThisShare('animaker-chat');
    shareToast('Shared with ' + successCount + (successCount === 1 ? ' chat' : ' chats') + '!', 'success');
  }
  if (failCount > 0) {
    shareToast('Could not share with ' + failCount + (failCount === 1 ? ' chat' : ' chats'), 'error');
  }
  if (successCount > 0) {
    setTimeout(closeShareSheet, 700);
  } else if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.querySelector('span').textContent = 'Send';
  }
}

/* ---- View a shared creation (from chat card) ---- */
function viewSharedCreation(creationId, type) {
  var map = { creator: 'openCreatorDetail', writer: 'openStoryDetail', maker: 'openMakerDetail' };
  var fn = map[type] || map.creator;
  if (typeof window[fn] === 'function') { window[fn](creationId); return; }
  window.open(getCreationShareUrl({ id: creationId, type: type }), '_blank');
}

/* ---- Deep link: ?creation=ID opens the creation ---- */
function handleCreationDeepLink() {
  var params;
  try { params = new URLSearchParams(window.location.search); } catch (e) { return; }
  var id = params.get('creation');
  if (!id) return;

  var tries = 0;
  var timer = setInterval(function() {
    tries++;
    var ready = typeof window.fetchCreation === 'function';
    if (!ready && tries < 40) return;
    clearInterval(timer);
    if (!ready) return;

    history.replaceState(null, '', window.location.pathname);

    window.fetchCreation(id).then(function(c) {
      if (!c) return;
      var fn = c.type === 'writer' ? 'openStoryDetail' : c.type === 'maker' ? 'openMakerDetail' : 'openCreatorDetail';
      if (typeof window[fn] === 'function') window[fn](c.id);
      else shareToast('Could not open the shared creation', 'error');
    }).catch(function() {});
  }, 150);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', handleCreationDeepLink);
} else {
  handleCreationDeepLink();
}
