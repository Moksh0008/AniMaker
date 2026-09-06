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
  var { data } = await supabaseClient
    .from('notifications')
    .select('*, from_user:from_user_id(username, avatar_url, full_name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
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
  if (!container) return;
  var existing = document.getElementById('notifBellWrap');
  if (existing) return;

  var wrap = document.createElement('div');
  wrap.id = 'notifBellWrap';
  wrap.style.cssText = 'position:relative;display:inline-flex;align-items:center;margin-left:12px;';
  wrap.innerHTML = '<button id="notifBellBtn" style="background:none;border:none;color:var(--text-secondary);font-size:18px;cursor:pointer;padding:6px;border-radius:8px;transition:color 0.15s;" onmouseenter="this.style.color=\'#fff\'" onmouseleave="this.style.color=\'var(--text-secondary)\'" aria-label="Notifications"><i class="fas fa-bell"></i><span id="notifBadge" style="display:none;position:absolute;top:2px;right:2px;width:16px;height:16px;background:#ef4444;color:#fff;font-size:10px;font-weight:700;border-radius:50%;display:none;align-items:center;justify-content:center;"></span></button><div id="notifDropdown" style="display:none;position:absolute;top:100%;right:0;width:360px;max-height:420px;overflow-y:auto;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.4);z-index:2000;margin-top:8px;"></div>';
  container.appendChild(wrap);

  document.getElementById('notifBellBtn').onclick = toggleNotifDropdown;
  loadNotifBadge();
}

async function loadNotifBadge() {
  var badge = document.getElementById('notifBadge');
  if (!badge) return;
  try {
    var count = await getUnreadCount();
    if (count > 0) {
      badge.style.display = 'flex';
      badge.textContent = count > 9 ? '9+' : count;
    } else {
      badge.style.display = 'none';
    }
  } catch(e) {}
}

async function toggleNotifDropdown() {
  var dropdown = document.getElementById('notifDropdown');
  if (!dropdown) return;
  if (dropdown.style.display === 'block') {
    dropdown.style.display = 'none';
    return;
  }
  dropdown.style.display = 'block';
  dropdown.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i></div>';

  try {
    var notifs = await getNotifications(20);
    if (notifs.length === 0) {
      dropdown.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px;">No notifications yet</div>';
    } else {
      var html = '<div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;"><span style="font-weight:600;color:#fff;font-size:14px;">Notifications</span><button onclick="markAllRead();loadNotifBadge();document.getElementById(\'notifDropdown\').innerHTML=\'\';toggleNotifDropdown();" style="background:none;border:none;color:var(--accent);font-size:12px;cursor:pointer;">Mark all read</button></div>';
      notifs.forEach(function(n) {
        var from = n.from_user || {};
        var avatar = from.avatar_url
          ? '<img src="' + from.avatar_url + '" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;">'
          : '<div style="width:32px;height:32px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px;flex-shrink:0;">' + ((from.full_name || from.username || '?').charAt(0).toUpperCase()) + '</div>';
        var icon = n.type === 'comment' ? 'fa-comment' : n.type === 'follow' ? 'fa-user-plus' : n.type === 'like' ? 'fa-heart' : 'fa-bell';
        var bg = n.is_read ? 'transparent' : 'rgba(124,92,252,0.08)';
        var clickAction = n.creation_id ? 'onclick="toggleNotifDropdown();openCreatorDetail(\'' + n.creation_id + '\')"' : '';
        html += '<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:' + bg + ';cursor:pointer;transition:background 0.15s;" ' + clickAction + ' onmouseenter="this.style.background=\'rgba(255,255,255,0.05)\'" onmouseleave="this.style.background=\'' + bg + '\'">' +
          avatar +
          '<div style="flex:1;min-width:0;"><div style="font-size:13px;color:var(--text-secondary);line-height:1.4;">' + (n.message || n.type) + '</div><div style="font-size:11px;color:var(--text-muted);margin-top:2px;">' + timeAgo(n.created_at) + '</div></div>' +
          '<i class="fas ' + icon + '" style="font-size:12px;color:var(--accent);flex-shrink:0;"></i>' +
        '</div>';
      });
      dropdown.innerHTML = html;
    }
  } catch(e) {
    dropdown.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px;">Couldn\'t load notifications</div>';
  }
}

// Close dropdown on outside click
document.addEventListener('click', function(e) {
  var wrap = document.getElementById('notifBellWrap');
  var dropdown = document.getElementById('notifDropdown');
  if (wrap && dropdown && !wrap.contains(e.target)) {
    dropdown.style.display = 'none';
  }
});

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
