/* =========================================================
   AniMaker — Social & Community System (Supabase)
   
   Handles: Likes, Comments, Comment Likes, Follows, Saves
   ========================================================= */

/* ----LIKES---- */

async function toggleLike(creationId) {
  if (!supabaseClient) throw new Error('Supabase not available');
  var session = await getSession();
  if (!session || !session.user) throw new Error('Not authenticated');

  // Check if already liked
  var { data: existing } = await supabaseClient
    .from('creation_likes')
    .select('id')
    .eq('creation_id', creationId)
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (existing) {
    // Unlike
    var { error } = await supabaseClient
      .from('creation_likes')
      .delete()
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
    return false;
  } else {
    // Like
    var { error } = await supabaseClient
      .from('creation_likes')
      .insert({ creation_id: creationId, user_id: session.user.id });
    if (error) throw new Error(error.message);
    return true;
  }
}

async function hasUserLiked(creationId) {
  if (!supabaseClient) return false;
  var session = await getSession();
  if (!session || !session.user) return false;

  var { data } = await supabaseClient
    .from('creation_likes')
    .select('id')
    .eq('creation_id', creationId)
    .eq('user_id', session.user.id)
    .maybeSingle();

  return !!data;
}

async function getLikeCount(creationId) {
  if (!supabaseClient) return 0;
  var { count } = await supabaseClient
    .from('creation_likes')
    .select('id', { count: 'exact', head: true })
    .eq('creation_id', creationId);
  return count || 0;
}

async function getLikeCounts(creationIds) {
  if (!supabaseClient || !creationIds.length) return {};
  var counts = {};
  for (var i = 0; i < creationIds.length; i++) {
    counts[creationIds[i]] = await getLikeCount(creationIds[i]);
  }
  return counts;
}

async function getMyLikedCreationIds(creationIds) {
  if (!supabaseClient || !creationIds.length) return {};
  var session = await getSession();
  if (!session || !session.user) return {};

  var { data } = await supabaseClient
    .from('creation_likes')
    .select('creation_id')
    .in('creation_id', creationIds)
    .eq('user_id', session.user.id);

  var result = {};
  if (data) data.forEach(function(r) { result[r.creation_id] = true; });
  return result;
}

/* ----COMMENTS---- */

async function getComments(creationId, limit, offset) {
  if (!supabaseClient) return [];
  limit = limit || 10;
  offset = offset || 0;

  var { data, error } = await supabaseClient
    .from('comments')
    .select('*, profiles:user_id(username, full_name, avatar_url)')
    .eq('creation_id', creationId)
    .is('parent_comment_id', null)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[AniMaker] getComments error:', error.message);
    return [];
  }
  return data || [];
}

async function getCommentCount(creationId) {
  if (!supabaseClient) return 0;
  var { count } = await supabaseClient
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('creation_id', creationId);
  return count || 0;
}

async function getReplies(commentId) {
  if (!supabaseClient) return [];

  var { data, error } = await supabaseClient
    .from('comments')
    .select('*, profiles:user_id(username, full_name, avatar_url)')
    .eq('parent_comment_id', commentId)
    .order('created_at', { ascending: true })
    .limit(20);

  if (error) return [];
  return data || [];
}

async function postComment(creationId, content, parentCommentId) {
  if (!supabaseClient) throw new Error('Supabase not available');
  var session = await getSession();
  if (!session || !session.user) throw new Error('Not authenticated');

  if (!content || !content.trim()) throw new Error('Comment cannot be empty');
  if (content.length > 1000) throw new Error('Comment is too long (max 1000 characters)');

  var record = {
    creation_id: creationId,
    user_id: session.user.id,
    content: content.trim()
  };
  if (parentCommentId) record.parent_comment_id = parentCommentId;

  var { data, error } = await supabaseClient
    .from('comments')
    .insert(record)
    .select('*, profiles:user_id(username, full_name, avatar_url)')
    .single();

  if (error) throw new Error(error.message || 'Failed to post comment');
  return data;
}

async function editComment(commentId, content) {
  if (!supabaseClient) throw new Error('Supabase not available');
  var session = await getSession();
  if (!session || !session.user) throw new Error('Not authenticated');

  if (!content || !content.trim()) throw new Error('Comment cannot be empty');

  var { data, error } = await supabaseClient
    .from('comments')
    .update({ content: content.trim(), updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .eq('user_id', session.user.id)
    .select('*, profiles:user_id(username, full_name, avatar_url)')
    .single();

  if (error) throw new Error(error.message || 'Failed to edit comment');
  return data;
}

async function deleteComment(commentId) {
  if (!supabaseClient) throw new Error('Supabase not available');
  var session = await getSession();
  if (!session || !session.user) throw new Error('Not authenticated');

  var { error } = await supabaseClient
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', session.user.id);

  if (error) throw new Error(error.message || 'Failed to delete comment');
  return true;
}

/* ----COMMENT LIKES---- */

async function toggleCommentLike(commentId) {
  if (!supabaseClient) throw new Error('Supabase not available');
  var session = await getSession();
  if (!session || !session.user) throw new Error('Not authenticated');

  var { data: existing } = await supabaseClient
    .from('comment_likes')
    .select('id')
    .eq('comment_id', commentId)
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (existing) {
    var { error } = await supabaseClient
      .from('comment_likes')
      .delete()
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
    return false;
  } else {
    var { error } = await supabaseClient
      .from('comment_likes')
      .insert({ comment_id: commentId, user_id: session.user.id });
    if (error) throw new Error(error.message);
    return true;
  }
}

async function getCommentLikeCount(commentId) {
  if (!supabaseClient) return 0;
  var { count } = await supabaseClient
    .from('comment_likes')
    .select('id', { count: 'exact', head: true })
    .eq('comment_id', commentId);
  return count || 0;
}

async function getMyLikedCommentIds(commentIds) {
  if (!supabaseClient || !commentIds.length) return {};
  var session = await getSession();
  if (!session || !session.user) return {};

  var { data } = await supabaseClient
    .from('comment_likes')
    .select('comment_id')
    .in('comment_id', commentIds)
    .eq('user_id', session.user.id);

  var result = {};
  if (data) data.forEach(function(r) { result[r.comment_id] = true; });
  return result;
}

/* ----FOLLOWS---- */

async function toggleFollow(targetUserId) {
  if (!supabaseClient) throw new Error('Supabase not available');
  var session = await getSession();
  if (!session || !session.user) throw new Error('Not authenticated');
  if (session.user.id === targetUserId) throw new Error('You cannot follow yourself');

  var { data: existing } = await supabaseClient
    .from('follows')
    .select('id')
    .eq('follower_id', session.user.id)
    .eq('following_id', targetUserId)
    .maybeSingle();

  if (existing) {
    var { error } = await supabaseClient
      .from('follows')
      .delete()
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
    return false;
  } else {
    var { error } = await supabaseClient
      .from('follows')
      .insert({ follower_id: session.user.id, following_id: targetUserId });
    if (error) throw new Error(error.message);
    return true;
  }
}

async function isFollowing(targetUserId) {
  if (!supabaseClient) return false;
  var session = await getSession();
  if (!session || !session.user) return false;

  var { data } = await supabaseClient
    .from('follows')
    .select('id')
    .eq('follower_id', session.user.id)
    .eq('following_id', targetUserId)
    .maybeSingle();

  return !!data;
}

async function getFollowerCount(userId) {
  if (!supabaseClient) return 0;
  var { count } = await supabaseClient
    .from('follows')
    .select('id', { count: 'exact', head: true })
    .eq('following_id', userId);
  return count || 0;
}

async function getFollowingCount(userId) {
  if (!supabaseClient) return 0;
  var { count } = await supabaseClient
    .from('follows')
    .select('id', { count: 'exact', head: true })
    .eq('follower_id', userId);
  return count || 0;
}

/* ----SAVES / BOOKMARKS---- */

async function toggleSave(creationId) {
  if (!supabaseClient) throw new Error('Supabase not available');
  var session = await getSession();
  if (!session || !session.user) throw new Error('Not authenticated');

  var { data: existing } = await supabaseClient
    .from('saved_creations')
    .select('id')
    .eq('creation_id', creationId)
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (existing) {
    var { error } = await supabaseClient
      .from('saved_creations')
      .delete()
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
    return false;
  } else {
    var { error } = await supabaseClient
      .from('saved_creations')
      .insert({ creation_id: creationId, user_id: session.user.id });
    if (error) throw new Error(error.message);
    return true;
  }
}

async function hasUserSaved(creationId) {
  if (!supabaseClient) return false;
  var session = await getSession();
  if (!session || !session.user) return false;

  var { data } = await supabaseClient
    .from('saved_creations')
    .select('id')
    .eq('creation_id', creationId)
    .eq('user_id', session.user.id)
    .maybeSingle();

  return !!data;
}

async function getSavedCreationIds(creationIds) {
  if (!supabaseClient || !creationIds.length) return {};
  var session = await getSession();
  if (!session || !session.user) return {};

  var { data } = await supabaseClient
    .from('saved_creations')
    .select('creation_id')
    .in('creation_id', creationIds)
    .eq('user_id', session.user.id);

  var result = {};
  if (data) data.forEach(function(r) { result[r.creation_id] = true; });
  return result;
}

async function getSavedCreations(userId, limit, offset) {
  if (!supabaseClient) return [];
  limit = limit || 20;
  offset = offset || 0;

  var { data, error } = await supabaseClient
    .from('saved_creations')
    .select('creation_id, created_at, creations(*, profiles:user_id(username, full_name, avatar_url))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return [];
  return (data || []).map(function(r) { return r.creations; }).filter(Boolean);
}

async function getSaveCount(creationId) {
  if (!supabaseClient) return 0;
  var { count } = await supabaseClient
    .from('saved_creations')
    .select('id', { count: 'exact', head: true })
    .eq('creation_id', creationId);
  return count || 0;
}

/* ----BATCH SOCIAL DATA for creation cards---- */

async function getBatchSocialData(creationIds) {
  if (!supabaseClient || !creationIds.length) return {};

  var session = await getSession();
  var userId = session && session.user ? session.user.id : null;
  var result = {};

  // Init
  creationIds.forEach(function(id) {
    result[id] = { likes: 0, comments: 0, isLiked: false, isSaved: false };
  });

  // Like counts
  for (var i = 0; i < creationIds.length; i++) {
    result[creationIds[i]].likes = await getLikeCount(creationIds[i]);
  }

  // Comment counts
  for (var i = 0; i < creationIds.length; i++) {
    result[creationIds[i]].comments = await getCommentCount(creationIds[i]);
  }

  // My liked
  if (userId) {
    var liked = await getMyLikedCreationIds(creationIds);
    Object.keys(liked).forEach(function(id) {
      if (result[id]) result[id].isLiked = true;
    });
  }

  // My saved
  if (userId) {
    var saved = await getSavedCreationIds(creationIds);
    Object.keys(saved).forEach(function(id) {
      if (result[id]) result[id].isSaved = true;
    });
  }

  return result;
}

/* ----UNIQUE COUNT HELPERS (for profiles)---- */

async function getCreationLikeCountForUser(userId) {
  if (!supabaseClient) return 0;
  // Get all creation IDs for this user
  var { data: creations } = await supabaseClient
    .from('creations')
    .select('id')
    .eq('user_id', userId);

  if (!creations || !creations.length) return 0;

  var total = 0;
  for (var i = 0; i < creations.length; i++) {
    var c = await getLikeCount(creations[i].id);
    total += c;
  }
  return total;
}

/* =========================================================
   Notifications
   ========================================================= */

async function createNotification(targetUserId, type, creationId, commentId, message) {
  if (!supabaseClient) return;
  var session = await getSession();
  if (!session || !session.user) return;
  if (session.user.id === targetUserId) return; // Don't notify self

  try {
    await supabaseClient.rpc('create_notification', {
      p_user_id: targetUserId,
      p_from_user_id: session.user.id,
      p_type: type,
      p_creation_id: creationId || null,
      p_comment_id: commentId || null,
      p_message: message || ''
    });
  } catch(e) { console.error('[Notification] create error:', e); }
}

async function getNotifications(limit) {
  if (!supabaseClient) return [];
  limit = limit || 20;
  // NOTE: from_user_id references auth.users (no profile columns), so the
  // sender profile is joined client-side below instead of via an embed.
  var { data, error } = await supabaseClient
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('[Notifications] load error:', error.message); return []; }
  data = data || [];

  var ids = [];
  data.forEach(function(n) { if (n.from_user_id && ids.indexOf(n.from_user_id) === -1) ids.push(n.from_user_id); });
  if (ids.length) {
    try {
      var { data: profs } = await supabaseClient
        .from('profiles')
        .select('id, username, avatar_url, full_name')
        .in('id', ids);
      var map = {};
      (profs || []).forEach(function(p) { map[p.id] = p; });
      data.forEach(function(n) { n.from_user = map[n.from_user_id] || null; });
    } catch (e2) { /* avatars/names just stay generic */ }
  }

  // Batch-fetch creation thumbnails for rows that reference a creation
  var cids = [];
  data.forEach(function(n) { if (n.creation_id && cids.indexOf(n.creation_id) === -1) cids.push(n.creation_id); });
  if (cids.length) {
    try {
      var { data: crs } = await supabaseClient
        .from('creations')
        .select('id, cover_image_url, media_url, type')
        .in('id', cids);
      var cmap = {};
      (crs || []).forEach(function(cc) { cmap[cc.id] = cc; });
      data.forEach(function(n) { n.creation = cmap[n.creation_id] || null; });
    } catch (e3) { /* thumbnails just stay hidden */ }
  }
  return data;
}

async function getUnreadCount() {
  if (!supabaseClient) return 0;
  var { count } = await supabaseClient
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false);
  return count || 0;
}

async function markAllRead() {
  if (!supabaseClient) return;
  var session = await getSession();
  if (!session || !session.user) return;
  await supabaseClient
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', session.user.id)
    .eq('is_read', false);
}

async function getFollowers(userId, limit, offset) {
  if (!supabaseClient) return [];
  limit = limit || 20;
  offset = offset || 0;
  var { data } = await supabaseClient
    .from('follows')
    .select('follower_id, created_at, profiles:follower_id(username, full_name, avatar_url)')
    .eq('following_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  return data || [];
}

async function getFollowing(userId, limit, offset) {
  if (!supabaseClient) return [];
  limit = limit || 20;
  offset = offset || 0;
  var { data } = await supabaseClient
    .from('follows')
    .select('following_id, created_at, profiles:following_id(username, full_name, avatar_url)')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  return data || [];
}

/* =========================================================
   UI: Notification Bell
   ========================================================= */

function renderNotificationBell() {
  var container = document.querySelector('.nav-actions');
  if (container) {
    var existing = document.getElementById('notifBellWrap');
    if (!existing) {
      var wrap = document.createElement('div');
      wrap.id = 'notifBellWrap';
      wrap.style.cssText = 'position:relative;display:inline-flex;align-items:center;margin-left:12px;';
      wrap.innerHTML = '<button id="notifBellBtn" style="background:none;border:none;color:var(--text-secondary);font-size:18px;cursor:pointer;padding:6px;border-radius:8px;transition:color 0.15s;" onmouseenter="this.style.color=\'#fff\'" onmouseleave="this.style.color=\'var(--text-secondary)\'" aria-label="Notifications"><i class="fas fa-bell"></i><span id="notifBadge" style="position:absolute;top:2px;right:2px;min-width:16px;height:16px;background:#ef4444;color:#fff;font-size:10px;font-weight:700;border-radius:8px;display:none;align-items:center;justify-content:center;padding:0 4px;"></span></button><div id="notifDropdown" style="display:none;position:absolute;top:100%;right:0;width:360px;max-height:420px;overflow-y:auto;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.4);z-index:2000;margin-top:8px;"></div>';
      container.appendChild(wrap);
      document.getElementById('notifBellBtn').onclick = toggleNotifDropdown;
    }
  }
  renderSidebarNotifications();
  loadNotifBadge();
  startNotifRealtime();
}

/* ---- Real-time notifications ----
   Instant updates via Supabase Realtime (postgres_changes on the
   notifications table), with a 60s polling fallback for missed events. */
var _notifRealtimeStarted = false;

async function startNotifRealtime() {
  if (_notifRealtimeStarted || !supabaseClient) return;
  var session = await getSession();
  if (!session || !session.user) return;
  _notifRealtimeStarted = true;
  var myId = session.user.id;

  try {
    if (typeof supabaseClient.channel === 'function') {
      supabaseClient
        .channel('notif-' + myId.slice(0, 8))
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + myId },
          function(payload) { handleNewNotification(payload.new); })
        .subscribe();
    }
  } catch (e) { /* fall back to polling only */ }

  // Polling safety net: refresh badges every 60s
  setInterval(async function() {
    try {
      var c = await getUnreadCount();
      setNotifBadgeEl(document.getElementById('notifBadge'), c);
      setNotifBadgeEl(document.getElementById('sidebarNotifBadge'), c);
    } catch (e2) {}
  }, 60000);
}

async function handleNewNotification(n) {
  // Refresh both badges
  loadNotifBadge();

  // Toast with the sender's message
  try {
    var msg = (n && n.message) ? n.message : 'You have a new notification';
    if (typeof showToast === 'function') showToast(msg, 'info');
  } catch (e1) {}

  // If a panel is open, live-refresh its list
  var dd = document.getElementById('notifDropdown');
  var sp = document.getElementById('sidebarNotifPanel');
  if ((dd && dd.style.display === 'block') || (sp && sp.style.display === 'block')) {
    try {
      var list = await getNotifications(20);
      var html = buildNotifPanelHtml(list);
      if (dd && dd.style.display === 'block') dd.innerHTML = html;
      if (sp && sp.style.display === 'block') sp.innerHTML = html;
    } catch (e2) {}
  }
}

function setNotifBadgeEl(el, count) {
  if (!el) return;
  if (count > 0) {
    el.style.display = 'flex';
    el.textContent = count > 9 ? '9+' : count;
  } else {
    el.style.display = 'none';
  }
}

async function loadNotifBadge() {
  try {
    var count = await getUnreadCount();
    setNotifBadgeEl(document.getElementById('notifBadge'), count);
    setNotifBadgeEl(document.getElementById('sidebarNotifBadge'), count);
  } catch(e) {}
}

function closeNotifPanels() {
  var dd = document.getElementById('notifDropdown');
  if (dd) dd.style.display = 'none';
  var sp = document.getElementById('sidebarNotifPanel');
  if (sp) sp.style.display = 'none';
}

/* ---- Shared notification panel markup (grouped, Instagram-style) ---- */
function notifTypeIcon(type) {
  if (type === 'comment') return { cls: 'fa-comment', bg: '#3b82f6' };
  if (type === 'follow') return { cls: 'fa-user-plus', bg: '#22c55e' };
  if (type === 'like') return { cls: 'fa-heart', bg: '#ef4444' };
  if (type === 'message') return { cls: 'fa-envelope', bg: '#8b5cf6' };
  if (type === 'comment_like') return { cls: 'fa-thumbs-up', bg: '#f59e0b' };
  return { cls: 'fa-bell', bg: '#64748b' };
}

function notifGroupLabel(d) {
  var now = Date.now();
  var t = new Date(d).getTime();
  var mins = Math.floor((now - t) / 60000);
  if (mins < 60 * 24) return 'Today';
  if (mins < 60 * 24 * 7) return 'This week';
  if (mins < 60 * 24 * 30) return 'This month';
  return 'Earlier';
}

function buildNotifPanelHtml(notifs) {
  if (notifs.length === 0) {
    return '<div style="padding:36px 24px;text-align:center;color:var(--text-muted);">' +
      '<i class="far fa-bell" style="font-size:28px;display:block;margin-bottom:10px;opacity:0.5;"></i>' +
      '<div style="font-size:13px;">No notifications yet</div>' +
      '<div style="font-size:12px;margin-top:4px;opacity:0.7;">Likes, comments and follows will show up here</div>' +
    '</div>';
  }

  var html = '<div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">' +
    '<span style="font-weight:700;color:#fff;font-size:15px;">Notifications</span>' +
    '<button onclick="markAllRead();loadNotifBadge();closeNotifPanels();" style="background:none;border:none;color:var(--accent);font-size:12px;font-weight:600;cursor:pointer;">Mark all read</button>' +
  '</div>';

  var lastGroup = null;
  notifs.forEach(function(n) {
    // Group headers: New (any unread) > Today > This week > ...
    var group = n.is_read ? notifGroupLabel(n.created_at) : 'New';
    if (group !== lastGroup) {
      html += '<div style="padding:10px 16px 4px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:' + (group === 'New' ? 'var(--accent)' : 'var(--text-muted)') + ';">' + group + '</div>';
      lastGroup = group;
    }

    var from = n.from_user || {};
    var name = postEscapeHtmlLocal(from.full_name || from.username || 'Someone');
    var verb = n.type === 'comment' ? 'commented on your post' : n.type === 'follow' ? 'started following you' : n.type === 'like' ? 'liked your post' : n.type === 'comment_like' ? 'liked your comment' : n.type === 'message' ? 'sent you a message' : 'interacted with you';

    var icon = notifTypeIcon(n.type);

    // Avatar with small type badge overlapping bottom-right
    var avatarInner = from.avatar_url
      ? '<img src="' + from.avatar_url + '" style="width:44px;height:44px;border-radius:50%;object-fit:cover;">'
      : '<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#9333ea);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;">' + (from.full_name || from.username || '?').charAt(0).toUpperCase() + '</div>';
    var avatar = '<div style="position:relative;flex-shrink:0;">' + avatarInner +
      '<span style="position:absolute;bottom:-2px;right:-2px;width:18px;height:18px;border-radius:50%;background:' + icon.bg + ';border:2px solid var(--bg-card);display:flex;align-items:center;justify-content:center;"><i class="fas ' + icon.cls + '" style="font-size:8px;color:#fff;"></i></span>' +
    '</div>';

    // Optional creation thumbnail on the right (Instagram-style)
    var thumb = '';
    var cr = n.creation;
    if (cr) {
      var turl = cr.cover_image_url || (cr.type === 'maker' ? cr.media_url : '');
      if (turl) thumb = '<img src="' + turl + '" style="width:44px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0;">';
    }

    var bg = n.is_read ? 'transparent' : 'rgba(124,92,252,0.08)';
    var clickAction = '';
    if (n.type === 'message') {
      // Deep-link straight into the chat with the sender
      var target = n.from_user && n.from_user.username
        ? 'chat.html?user=' + encodeURIComponent(n.from_user.username)
        : 'chat.html';
      clickAction = 'onclick="closeNotifPanels();window.location.href=\'' + target + '\'"';
    } else if (n.creation_id) {
      clickAction = 'onclick="closeNotifPanels();openCreationDetailById(\'' + n.creation_id + '\')"';
    }

    html += '<div style="display:flex;align-items:center;gap:12px;padding:10px 16px;background:' + bg + ';cursor:pointer;transition:background 0.15s;" ' + clickAction + ' onmouseenter="this.style.background=\'rgba(255,255,255,0.05)\'" onmouseleave="this.style.background=\'' + bg + '\'">' +
      avatar +
      '<div style="flex:1;min-width:0;font-size:13px;line-height:1.45;color:var(--text-secondary);">' +
        '<span style="color:#fff;font-weight:600;">' + name + '</span> ' + verb +
        '<span style="display:block;font-size:11px;color:var(--text-muted);margin-top:2px;">' + timeAgo(n.created_at) + '</span>' +
      '</div>' +
      thumb +
    '</div>';
  });
  return html;
}

function postEscapeHtmlLocal(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function toggleNotifDropdown() {
  var dropdown = document.getElementById('notifDropdown');
  if (!dropdown) return;
  if (dropdown.style.display === 'block') {
    dropdown.style.display = 'none';
    return;
  }
  closeNotifPanels();
  dropdown.style.display = 'block';
  dropdown.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i></div>';

  try {
    var notifs = await getNotifications(20);
    dropdown.innerHTML = buildNotifPanelHtml(notifs);
  } catch(e) {
    dropdown.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px;">Couldn\'t load notifications</div>';
  }
}

/* ---- Instagram-style Notifications item in the sidebar ---- */
function renderSidebarNotifications() {
  var nav = document.querySelector('.sidebar-nav');
  if (!nav || document.getElementById('sidebarNotifLink')) return;

  var link = document.createElement('a');
  link.href = 'javascript:void(0)';
  link.id = 'sidebarNotifLink';
  link.className = 'sidebar-link';
  link.setAttribute('data-tooltip', 'Notifications');
  link.style.position = 'relative';
  link.onclick = toggleSidebarNotifPanel;
  link.innerHTML = '<i class="fas fa-heart"></i><span>Notifications</span><span id="sidebarNotifBadge" style="position:absolute;top:2px;right:4px;min-width:16px;height:16px;background:#ef4444;color:#fff;font-size:10px;font-weight:700;border-radius:8px;display:none;align-items:center;justify-content:center;padding:0 4px;z-index:2;"></span>';

  var messages = nav.querySelector('a[href="chat.html"]');
  if (messages && messages.parentNode === nav) nav.insertBefore(link, messages.nextSibling);
  else nav.appendChild(link);

  var panel = document.createElement('div');
  panel.id = 'sidebarNotifPanel';
  panel.style.cssText = 'display:none;position:fixed;width:360px;max-height:420px;overflow-y:auto;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.4);z-index:3000;';
  document.body.appendChild(panel);
}

async function toggleSidebarNotifPanel() {
  var panel = document.getElementById('sidebarNotifPanel');
  var link = document.getElementById('sidebarNotifLink');
  if (!panel || !link) return;
  if (panel.style.display === 'block') {
    panel.style.display = 'none';
    return;
  }
  closeNotifPanels();
  // Position next to the sidebar item, like Instagram's popover
  var rect = link.getBoundingClientRect();
  panel.style.left = (rect.right + 12) + 'px';
  panel.style.top = Math.max(70, Math.min(rect.top - 60, window.innerHeight - 440)) + 'px';
  panel.style.display = 'block';
  panel.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i></div>';

  try {
    var notifs = await getNotifications(20);
    panel.innerHTML = buildNotifPanelHtml(notifs);
  } catch(e) {
    panel.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px;">Couldn\'t load notifications</div>';
  }
}

// Close panels on outside click
document.addEventListener('click', function(e) {
  var wrap = document.getElementById('notifBellWrap');
  var dropdown = document.getElementById('notifDropdown');
  if (wrap && dropdown && !wrap.contains(e.target)) {
    dropdown.style.display = 'none';
  }
  var sLink = document.getElementById('sidebarNotifLink');
  var sPanel = document.getElementById('sidebarNotifPanel');
  if (sPanel && sPanel.style.display === 'block' && sLink && !sLink.contains(e.target) && !sPanel.contains(e.target)) {
    sPanel.style.display = 'none';
  }
});

/* ---- Open the right detail view for a creation notification ----
   Routes writer stories to the story reader instead of the creator popup. */
async function openCreationDetailById(id) {
  try {
    var c = await fetchCreation(id);
    if (!c) return;
    if (c.type === 'writer' && typeof openStoryDetail === 'function') openStoryDetail(id);
    else if (c.type === 'maker' && typeof openMakerDetail === 'function') openMakerDetail(id);
    else openCreatorDetail(id);
  } catch (e) {
    openCreatorDetail(id);
  }
}

/* ---- Auto-open a notification passed via ?notify=<id> (cross-page clicks) ---- */
(function() {
  try {
    var params = new URLSearchParams(window.location.search);
    var nid = params.get('notify');
    if (nid) {
      history.replaceState(null, '', window.location.pathname);
      var tries = 0;
      var t = setInterval(function() {
        tries++;
        if (supabaseClient) {
          clearInterval(t);
          openCreationDetailById(nid);
        } else if (tries > 50) {
          clearInterval(t);
        }
      }, 100);
    }
  } catch (e) {}
})();

/* =========================================================
   UI: Followers/Following Modal
   ========================================================= */

function showFollowersModal(userId, type) {
  var overlay = document.createElement('div');
  overlay.className = 'edit-modal-overlay';
  overlay.style.zIndex = '4000';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = '<div class="follow-modal" onclick="event.stopPropagation()">' +
    '<div class="follow-modal-header"><h3>' + (type === 'followers' ? 'Followers' : 'Following') + '</h3><button class="follow-modal-close" onclick="this.closest(\'.edit-modal-overlay\').remove()"><i class="fas fa-xmark"></i></button></div>' +
    '<div class="follow-modal-search"><i class="fas fa-search"></i><input type="text" id="followSearchInput" placeholder="Search"></div>' +
    '<div class="follow-modal-list" id="followListBody"><div style="padding:20px;text-align:center;color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i></div></div>' +
  '</div>';
  document.body.appendChild(overlay);

  window._followListUserId = userId;
  window._followListType = type;
  loadFollowList(userId, type);

  document.getElementById('followSearchInput').addEventListener('input', function() {
    var q = this.value.toLowerCase();
    var items = document.querySelectorAll('.follow-modal-item');
    items.forEach(function(item) {
      var text = item.textContent.toLowerCase();
      item.style.display = text.indexOf(q) > -1 ? 'flex' : 'none';
    });
  });
}

async function loadFollowList(userId, type) {
  var body = document.getElementById('followListBody');
  if (!body) return;
  try {
    var list = type === 'followers' ? await getFollowers(userId) : await getFollowing(userId);
    var session = await getSession();
    var myId = session && session.user ? session.user.id : null;
    var isOwnProfile = myId === userId;

    if (list.length === 0) {
      body.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px;">' + (type === 'followers' ? 'No followers yet' : 'Not following anyone yet') + '</div>';
      return;
    }

    // Batch check which users I follow
    var userIds = list.map(function(item) {
      var pid = type === 'followers' ? item.follower_id : item.following_id;
      return pid;
    }).filter(Boolean);

    var myFollowing = {};
    if (myId && userIds.length) {
      var { data: myFollows } = await supabaseClient
        .from('follows')
        .select('following_id')
        .eq('follower_id', myId)
        .in('following_id', userIds);
      if (myFollows) myFollows.forEach(function(f) { myFollowing[f.following_id] = true; });
    }

    var html = '';
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      var p = item.profiles || {};
      var pid = type === 'followers' ? item.follower_id : item.following_id;
      var uname = p.username || '';
      var displayName = p.full_name || uname || 'User';
      var bio = p.role || '';
      var avatar = p.avatar_url
        ? '<img src="' + p.avatar_url + '" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0;">'
        : '<div style="width:44px;height:44px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;flex-shrink:0;">' + displayName.charAt(0).toUpperCase() + '</div>';

      var actionHtml = '';
      if (pid === myId) {
        // Don't show follow/remove for yourself
        actionHtml = '';
      } else if (isOwnProfile && type === 'followers') {
        // Own followers list: show Remove button
        actionHtml = '<button class="follow-modal-remove-btn" onclick="removeFollower(\'' + pid + '\', this)">Remove</button>';
      } else if (myFollowing[pid]) {
        actionHtml = '<button class="follow-modal-follow-btn following" onclick="toggleFollowFromList(\'' + pid + '\', this)">Following</button>';
      } else {
        actionHtml = '<button class="follow-modal-follow-btn" onclick="toggleFollowFromList(\'' + pid + '\', this)">Follow</button>';
      }

      html += '<div class="follow-modal-item" data-user-id="' + pid + '">' +
        '<a href="profile.html?user=' + uname + '" class="follow-modal-item-left">' +
          avatar +
          '<div><div class="follow-modal-username">' + displayName + '</div>' + (bio ? '<div class="follow-modal-bio">' + bio + '</div>' : '') + '</div>' +
        '</a>' +
        actionHtml +
      '</div>';
    }
    body.innerHTML = html;
  } catch(e) {
    body.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);">Couldn\'t load list</div>';
  }
}

window.toggleFollowFromList = async function(userId, btn) {
  if (!btn) return;
  var prevFollowing = btn.classList.contains('following');
  btn.disabled = true;
  try {
    var nowFollowing = await toggleFollow(userId);
    if (nowFollowing) {
      btn.className = 'follow-modal-follow-btn following';
      btn.textContent = 'Following';
      try {
        if (typeof createNotification === 'function') {
          var me = await getCurrentProfile();
          var name = me ? (me.full_name || me.username) : 'Someone';
          await createNotification(userId, 'follow', null, null, name + ' started following you');
        }
      } catch(e2) {}
    } else {
      btn.className = 'follow-modal-follow-btn';
      btn.textContent = 'Follow';
    }
  } catch(e) {
    btn.className = prevFollowing ? 'follow-modal-follow-btn following' : 'follow-modal-follow-btn';
    btn.textContent = prevFollowing ? 'Following' : 'Follow';
  } finally {
    btn.disabled = false;
  }
};

window.removeFollower = async function(userId, btn) {
  if (!confirm('Remove this follower?')) return;
  try {
    await supabaseClient.from('follows').delete().eq('follower_id', userId).eq('following_id', window._followListUserId);
    var item = btn.closest('.follow-modal-item');
    if (item) item.remove();
    // Update count
    var countEl = document.getElementById('followersCount');
    if (countEl) countEl.textContent = Math.max(0, parseInt(countEl.textContent) - 1);
  } catch(e) {
    if (typeof showToast === 'function') showToast('Could not remove follower', 'error');
  }
};
