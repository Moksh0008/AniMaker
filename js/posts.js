/* =========================================================
   AniMaker — Creations System (Supabase)
   
   Supports three creation types:
   - Creator: images + descriptions
   - Writer: stories + cover images
   - Maker: videos + thumbnails
   ========================================================= */

/* ---- Constants ---- */
var CREATION_TYPES = ['creator', 'writer', 'maker'];

var VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
var VALID_VIDEO_TYPES = ['video/mp4', 'video/webm'];
var MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
var MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

/* ---- Upload file to Supabase Storage ---- */
async function uploadCreationFile(file, bucket, onProgress) {
  if (!supabaseClient) throw new Error('Supabase not available');

  var session = await getSession();
  if (!session || !session.user) throw new Error('Not authenticated');

  var isImage = VALID_IMAGE_TYPES.includes(file.type);
  var isVideo = VALID_VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    throw new Error('Unsupported file type. Please upload JPG, PNG, WEBP, GIF, MP4, or WEBM.');
  }

  if (isImage && file.size > MAX_IMAGE_SIZE) {
    throw new Error('Image must be less than 10MB.');
  }
  if (isVideo && file.size > MAX_VIDEO_SIZE) {
    throw new Error('Video must be less than 100MB.');
  }

  var ext = file.name.split('.').pop() || (isImage ? 'jpg' : 'mp4');
  var timestamp = Date.now();
  var random = Math.random().toString(36).substring(2, 8);
  var filePath = session.user.id + '/' + timestamp + '-' + random + '.' + ext;

  // Use fetch with known anon key
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indkamlta2R0bnV6Z2VhYnJwZGJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNDg5MTAsImV4cCI6MjEwMzkyNDkxMH0.TUgdAOmmwhYs02Zqb0IpvA3f3WDboACjibswoT_91JY';
  var uploadUrl = supabaseClient.supabaseUrl + '/storage/v1/object/' + bucket + '/' + filePath;

  var response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + session.access_token,
      'Content-Type': file.type,
      'x-upsert': 'true'
    },
    body: file
  });

  if (!response.ok) {
    var errText = await response.text();
    throw new Error('Upload failed: ' + errText);
  }

  var publicUrl = supabaseClient.supabaseUrl + '/storage/v1/object/public/' + bucket + '/' + filePath;
  return { url: publicUrl, path: filePath };
}

/* ---- Delete file from Supabase Storage ---- */
async function deleteCreationFile(bucket, filePath) {
  if (!supabaseClient || !filePath) return;
  try {
    await supabaseClient.storage.from(bucket).remove([filePath]);
  } catch(e) {}
}

/* ---- Extract storage path from URL ---- */
function extractStoragePath(url, bucket) {
  if (!url) return null;
  var marker = '/object/public/' + bucket + '/';
  var idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.substring(idx + marker.length);
}

/* ---- Create a creation ---- */
async function createCreation(data) {
  if (!supabaseClient) throw new Error('Supabase not available');

  var session = await getSession();
  if (!session || !session.user) throw new Error('Not authenticated');

  var record = {
    user_id: session.user.id,
    type: data.type,
    title: data.title || '',
    description: data.description || '',
    genre: data.genre || '',
    tags: data.tags || [],
    cover_image_url: data.cover_image_url || '',
    media_url: data.media_url || '',
    story_content: data.story_content || ''
  };

  var { data: result, error } = await supabaseClient
    .from('creations')
    .insert(record)
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to create');
  return result;
}

/* ---- Fetch creations ---- */
async function fetchCreations(options) {
  if (!supabaseClient) return [];

  options = options || {};
  var limit = options.limit || 20;
  var offset = options.offset || 0;
  var userId = options.userId || null;
  var type = options.type || null;

  var query = supabaseClient
    .from('creations')
    .select('*, profiles:user_id(username, full_name, avatar_url, role)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (userId) {
    query = query.eq('user_id', userId);
  }
  if (type) {
    query = query.eq('type', type);
  }

  var { data, error } = await query;
  if (error) {
    console.error('[AniMaker] fetchCreations error:', error.message);
    return [];
  }
  return data || [];
}

/* ---- Fetch single creation ---- */
async function fetchCreation(id) {
  if (!supabaseClient) return null;

  var { data, error } = await supabaseClient
    .from('creations')
    .select('*, profiles:user_id(username, full_name, avatar_url, role)')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

/* ---- Update a creation ---- */
async function updateCreation(id, updates) {
  if (!supabaseClient) throw new Error('Supabase not available');

  var session = await getSession();
  if (!session || !session.user) throw new Error('Not authenticated');

  var updateData = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.cover_image_url !== undefined) updateData.cover_image_url = updates.cover_image_url;
  if (updates.story_content !== undefined) updateData.story_content = updates.story_content;
  if (updates.genre !== undefined) updateData.genre = updates.genre;
  if (updates.tags !== undefined) updateData.tags = updates.tags;

  var { data, error } = await supabaseClient
    .from('creations')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', session.user.id)
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to update');
  return data;
}

/* ---- Delete a creation ---- */
async function deleteCreation(id) {
  if (!supabaseClient) throw new Error('Supabase not available');

  var session = await getSession();
  if (!session || !session.user) throw new Error('Not authenticated');

  var creation = await fetchCreation(id);
  if (!creation) throw new Error('Creation not found');
  if (creation.user_id !== session.user.id) throw new Error('You can only delete your own creations');

  // Delete media files from storage
  if (creation.cover_image_url) {
    var imgPath = extractStoragePath(creation.cover_image_url, 'uploads');
    if (imgPath) await deleteCreationFile('uploads', imgPath);
  }
  if (creation.media_url) {
    var vidPath = extractStoragePath(creation.media_url, 'uploads');
    if (vidPath) await deleteCreationFile('uploads', vidPath);
  }

  var { error } = await supabaseClient
    .from('creations')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (error) throw new Error(error.message || 'Failed to delete');
  return true;
}

/* ---- Count creations by type for a user ---- */
async function countCreationsByType(userId) {
  if (!supabaseClient) return { creator: 0, writer: 0, maker: 0, total: 0 };

  var counts = { creator: 0, writer: 0, maker: 0, total: 0 };

  for (var i = 0; i < CREATION_TYPES.length; i++) {
    var t = CREATION_TYPES[i];
    var { count, error } = await supabaseClient
      .from('creations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', t);
    counts[t] = count || 0;
    counts.total += counts[t];
  }

  return counts;
}

/* ---- Utility: time ago ---- */
function timeAgo(dateStr) {
  if (!dateStr) return '';
  var now = new Date();
  var date = new Date(dateStr);
  var seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  var minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + 'm ago';
  var hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + 'h ago';
  var days = Math.floor(hours / 24);
  if (days < 7) return days + 'd ago';
  var weeks = Math.floor(days / 7);
  if (weeks < 4) return weeks + 'w ago';
  var months = Math.floor(days / 30);
  if (months < 12) return months + 'mo ago';
  return Math.floor(months / 12) + 'y ago';
}

/* ---- Utility: format file size ---- */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

/* ---- Utility: escape HTML ---- */
function postEscapeHtml(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ---- Utility: reading time estimate ---- */
function estimateReadingTime(text) {
  if (!text) return '1 min read';
  var words = text.split(/\s+/).length;
  var minutes = Math.max(1, Math.round(words / 200));
  return minutes + ' min read';
}

/* ---- Utility: get user avatar HTML ---- */
function getCreationUserAvatar(profile, size) {
  size = size || 36;
  if (!profile) return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:' + (size * 0.4) + 'px;">?</div>';
  if (profile.avatar_url) {
    return '<img src="' + profile.avatar_url + '" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;">';
  }
  var initial = (profile.full_name || profile.username || 'U').charAt(0).toUpperCase();
  return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:' + (size * 0.4) + 'px;">' + initial + '</div>';
}

/* ---- Utility: get user display name ---- */
function getCreationUserName(profile) {
  if (!profile) return 'Unknown';
  return profile.full_name || profile.username || 'Unknown';
}

/* ---- Search creations ---- */
async function searchCreations(query, type) {
  if (!supabaseClient || !query || !query.trim()) return await fetchCreations({ limit: 50, type: type });

  var q = query.trim();

  var queryBuilder = supabaseClient
    .from('creations')
    .select('*, profiles:user_id(username, full_name, avatar_url, role)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (type) queryBuilder = queryBuilder.eq('type', type);

  // Search across title, description, genre, and tags
  queryBuilder = queryBuilder.or(
    'title.ilike.%' + q + '%,description.ilike.%' + q + '%,genre.ilike.%' + q + '%,story_content.ilike.%' + q + '%'
  );

  var { data, error } = await queryBuilder;
  if (error) {
    console.error('[AniMaker] searchCreations error:', error.message);
    return [];
  }
  return data || [];
}

/* ---- Detail View Functions ---- */

function openCreatorDetail(id) {
  fetchCreation(id).then(async function(c) {
    if (!c) return;
    var profile = c.profiles || {};
    var userName = getCreationUserName(profile);
    var desc = postEscapeHtml(c.description || '').replace(/\n/g, '<br>');
    var session = await getSession();
    var isOwn = session && session.user && c.user_id === session.user.id;

    // Load social data
    var likeCount = await getLikeCount(id);
    var commentCount = await getCommentCount(id);
    var liked = await hasUserLiked(id);
    var saved = await hasUserSaved(id);
    var followingUser = !isOwn && session ? await isFollowing(c.user_id) : false;

    var followBtnHtml = '';
    if (!isOwn && session) {
      followBtnHtml = '<button class="follow-btn ' + (followingUser ? 'following' : 'follow') + '" id="cb-follow-' + c.user_id + '" onclick="handleFollow(\'' + c.user_id + '\', this)">' + (followingUser ? '<i class="fas fa-check"></i> Following' : '<i class="fas fa-plus"></i> Follow') + '</button>';
    }

    var overlay = document.createElement('div');
    overlay.className = 'creator-popup-overlay';
    overlay.id = 'detail-overlay-' + id;
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = '<button class="creator-popup-close" onclick="this.parentElement.remove()"><i class="fas fa-xmark"></i></button>' +
      '<div class="creator-popup">' +
        '<div class="creator-popup-image"><img src="' + (c.cover_image_url || '') + '"></div>' +
        '<div class="creator-popup-info">' +
          '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">' +
            '<a href="profile.html?user=' + (profile.username || '') + '" style="text-decoration:none;">' + getCreationUserAvatar(profile, 44) + '</a>' +
            '<div style="flex:1;"><a href="profile.html?user=' + (profile.username || '') + '" style="text-decoration:none;"><div style="color:#fff;font-weight:600;font-size:15px;">' + userName + '</div></a><div style="color:var(--accent);font-size:13px;">Creator</div></div>' +
            followBtnHtml +
          '</div>' +
          '<h1>' + postEscapeHtml(c.title) + '</h1>' +
          '<div style="font-size:14px;color:rgba(255,255,255,0.75);line-height:1.6;">' + desc + '</div>' +
          '<div class="creation-action-bar">' +
            '<button class="creation-action-btn' + (liked ? ' liked' : '') + '" onclick="handleLike(\'' + id + '\', this)">' +
              '<i class="fa' + (liked ? 's' : 'r') + ' fa-heart"></i> <span class="action-like-count">' + likeCount + '</span>' +
            '</button>' +
            '<button class="creation-action-btn" onclick="document.getElementById(\'comments-section-' + id + '\').scrollIntoView({behavior:\'smooth\'})">' +
              '<i class="far fa-comment"></i> <span class="action-comment-count">' + commentCount + '</span>' +
            '</button>' +
            '<button class="creation-action-btn' + (saved ? ' saved' : '') + '" onclick="handleSave(\'' + id + '\', this)">' +
              '<i class="fa' + (saved ? 's' : 'r') + ' fa-bookmark"></i> Save' +
            '</button>' +
          '</div>' +
          '<div class="comments-section" id="comments-section-' + id + '"></div>' +
          '<div style="margin-top:auto;padding-top:12px;border-top:1px solid var(--border);font-size:12px;color:var(--text-muted);">' + timeAgo(c.created_at) + '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    renderCommentsSection(id, overlay.querySelector('.comments-section'));
  });
}

function openStoryDetail(id) {
  fetchCreation(id).then(async function(c) {
    if (!c) return;
    var profile = c.profiles || {};
    var session = await getSession();
    var isOwn = session && session.user && c.user_id === session.user.id;

    var likeCount = await getLikeCount(id);
    var commentCount = await getCommentCount(id);
    var liked = await hasUserLiked(id);
    var saved = await hasUserSaved(id);
    var followingUser = !isOwn && session ? await isFollowing(c.user_id) : false;

    var followBtnHtml = '';
    if (!isOwn && session) {
      followBtnHtml = '<button class="follow-btn ' + (followingUser ? 'following' : 'follow') + '" onclick="handleFollow(\'' + c.user_id + '\', this)">' + (followingUser ? '<i class="fas fa-check"></i> Following' : '<i class="fas fa-plus"></i> Follow') + '</button>';
    }

    var overlay = document.createElement('div');
    overlay.className = 'detail-overlay';
    overlay.id = 'detail-overlay-' + id;
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = '<button class="detail-close" onclick="this.parentElement.remove()"><i class="fas fa-xmark"></i></button>' +
      '<div class="story-detail">' +
        (c.cover_image_url ? '<img class="story-detail-cover" src="' + c.cover_image_url + '">' : '') +
        '<div class="story-detail-body">' +
          '<div class="story-detail-title">' + postEscapeHtml(c.title) + '</div>' +
          '<div class="story-detail-author" style="justify-content:space-between;">' +
            '<div style="display:flex;align-items:center;gap:10px;">' +
              '<a href="profile.html?user=' + (profile.username || '') + '" style="text-decoration:none;">' + getCreationUserAvatar(profile, 40) + '</a>' +
              '<div><a href="profile.html?user=' + (profile.username || '') + '" style="text-decoration:none;"><div class="author-name" style="color:#fff;">' + getCreationUserName(profile) + '</div></a><div class="author-meta">' + estimateReadingTime(c.story_content) + '</div></div>' +
            '</div>' +
            followBtnHtml +
          '</div>' +
          '<div class="story-detail-content">' + postEscapeHtml(c.story_content || '').replace(/\n/g, '<br>') + '</div>' +
          '<div class="creation-action-bar">' +
            '<button class="creation-action-btn' + (liked ? ' liked' : '') + '" onclick="handleLike(\'' + id + '\', this)">' +
              '<i class="fa' + (liked ? 's' : 'r') + ' fa-heart"></i> <span class="action-like-count">' + likeCount + '</span>' +
            '</button>' +
            '<button class="creation-action-btn" onclick="document.getElementById(\'comments-section-' + id + '\').scrollIntoView({behavior:\'smooth\'})">' +
              '<i class="far fa-comment"></i> <span class="action-comment-count">' + commentCount + '</span>' +
            '</button>' +
            '<button class="creation-action-btn' + (saved ? ' saved' : '') + '" onclick="handleSave(\'' + id + '\', this)">' +
              '<i class="fa' + (saved ? 's' : 'r') + ' fa-bookmark"></i> Save' +
            '</button>' +
          '</div>' +
          '<div class="comments-section" id="comments-section-' + id + '"></div>' +
          '<div class="story-detail-footer"><span>' + timeAgo(c.created_at) + '</span></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    renderCommentsSection(id, overlay.querySelector('.comments-section'));
  });
}

function openMakerDetail(id) {
  fetchCreation(id).then(async function(c) {
    if (!c) return;
    var profile = c.profiles || {};
    var session = await getSession();
    var isOwn = session && session.user && c.user_id === session.user.id;

    var likeCount = await getLikeCount(id);
    var commentCount = await getCommentCount(id);
    var liked = await hasUserLiked(id);
    var saved = await hasUserSaved(id);
    var followingUser = !isOwn && session ? await isFollowing(c.user_id) : false;

    var followBtnHtml = '';
    if (!isOwn && session) {
      followBtnHtml = '<button class="follow-btn ' + (followingUser ? 'following' : 'follow') + '" onclick="handleFollow(\'' + c.user_id + '\', this)">' + (followingUser ? '<i class="fas fa-check"></i> Following' : '<i class="fas fa-plus"></i> Follow') + '</button>';
    }

    var overlay = document.createElement('div');
    overlay.className = 'detail-overlay';
    overlay.id = 'detail-overlay-' + id;
    overlay.onclick = function(e) { if (e.target === overlay) { var v = overlay.querySelector('video'); if (v) v.pause(); overlay.remove(); } };
    overlay.innerHTML = '<button class="detail-close" onclick="var v=this.parentElement.querySelector(\'video\');if(v)v.pause();this.parentElement.remove()"><i class="fas fa-xmark"></i></button>' +
      '<div class="maker-detail">' +
        '<video src="' + (c.media_url || '') + '" controls playsinline></video>' +
        '<div class="maker-detail-info">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
            '<div class="maker-detail-title" style="margin:0;">' + postEscapeHtml(c.title) + '</div>' +
            followBtnHtml +
          '</div>' +
          (c.description ? '<div class="maker-detail-desc">' + postEscapeHtml(c.description).replace(/\n/g, '<br>') + '</div>' : '') +
          '<div class="maker-detail-author">' +
            '<a href="profile.html?user=' + (profile.username || '') + '" style="text-decoration:none;">' + getCreationUserAvatar(profile, 40) + '</a>' +
            '<div><a href="profile.html?user=' + (profile.username || '') + '" style="text-decoration:none;"><div class="author-name" style="color:#fff;">' + getCreationUserName(profile) + '</div></a><div class="author-meta">' + timeAgo(c.created_at) + '</div></div>' +
          '</div>' +
          '<div class="creation-action-bar">' +
            '<button class="creation-action-btn' + (liked ? ' liked' : '') + '" onclick="handleLike(\'' + id + '\', this)">' +
              '<i class="fa' + (liked ? 's' : 'r') + ' fa-heart"></i> <span class="action-like-count">' + likeCount + '</span>' +
            '</button>' +
            '<button class="creation-action-btn" onclick="document.getElementById(\'comments-section-' + id + '\').scrollIntoView({behavior:\'smooth\'})">' +
              '<i class="far fa-comment"></i> <span class="action-comment-count">' + commentCount + '</span>' +
            '</button>' +
            '<button class="creation-action-btn' + (saved ? ' saved' : '') + '" onclick="handleSave(\'' + id + '\', this)">' +
              '<i class="fa' + (saved ? 's' : 'r') + ' fa-bookmark"></i> Save' +
            '</button>' +
          '</div>' +
          '<div class="comments-section" id="comments-section-' + id + '"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    renderCommentsSection(id, overlay.querySelector('.comments-section'));
  });
}

/* =========================================================
   Social Interaction Handlers
   ========================================================= */

/* ---- LIKE HANDLER ---- */
async function handleLike(creationId, btn) {
  if (!btn) return;
  var session = await getSession();
  if (!session) { window.location.href = 'pages/login.html'; return; }

  var countEl = btn.querySelector('.action-like-count');
  var iconEl = btn.querySelector('i');
  var prevLiked = btn.classList.contains('liked');
  var prevCount = parseInt(countEl.textContent) || 0;

  btn.classList.toggle('liked');
  if (prevLiked) {
    iconEl.className = 'far fa-heart';
    countEl.textContent = Math.max(0, prevCount - 1);
  } else {
    iconEl.className = 'fas fa-heart';
    countEl.textContent = prevCount + 1;
  }

  try {
    await toggleLike(creationId);
  } catch(e) {
    btn.classList.toggle('liked');
    iconEl.className = prevLiked ? 'fas fa-heart' : 'far fa-heart';
    countEl.textContent = prevCount;
  }
}

/* ---- SAVE HANDLER ---- */
async function handleSave(creationId, btn) {
  if (!btn) return;
  var session = await getSession();
  if (!session) { window.location.href = 'pages/login.html'; return; }

  var prevSaved = btn.classList.contains('saved');
  btn.classList.toggle('saved');
  var iconEl = btn.querySelector('i');
  iconEl.className = btn.classList.contains('saved') ? 'fas fa-bookmark' : 'far fa-bookmark';

  try {
    await toggleSave(creationId);
  } catch(e) {
    btn.classList.toggle('saved');
    iconEl.className = prevSaved ? 'fas fa-bookmark' : 'far fa-bookmark';
  }
}

/* ---- FOLLOW HANDLER ---- */
async function handleFollow(userId, btn) {
  if (!btn) return;
  var session = await getSession();
  if (!session) { window.location.href = 'pages/login.html'; return; }

  var prevFollowing = btn.classList.contains('following');
  btn.disabled = true;

  try {
    var isNowFollowing = await toggleFollow(userId);
    if (isNowFollowing) {
      btn.className = 'follow-btn following';
      btn.innerHTML = '<i class="fas fa-check"></i> Following';
    } else {
      btn.className = 'follow-btn follow';
      btn.innerHTML = '<i class="fas fa-plus"></i> Follow';
    }
  } catch(e) {
    if (prevFollowing) {
      btn.className = 'follow-btn following';
      btn.innerHTML = '<i class="fas fa-check"></i> Following';
    } else {
      btn.className = 'follow-btn follow';
      btn.innerHTML = '<i class="fas fa-plus"></i> Follow';
    }
  } finally {
    btn.disabled = false;
  }
}

/* ---- COMMENTS SECTION ---- */
async function renderCommentsSection(creationId, container) {
  if (!container) return;
  var session = await getSession();
  var isAuth = session && session.user;

  container.innerHTML = '<div class="comments-header"><h4>Comments</h4></div>' +
    (isAuth ? '<div class="comment-input-row"><div class="comment-input-avatar" id="comment-avatar-' + creationId + '"></div><div class="comment-input-wrap"><input type="text" id="comment-input-' + creationId + '" placeholder="Share your thoughts..." maxlength="1000"><button class="comment-post-btn" onclick="postNewComment(\'' + creationId + '\')" aria-label="Post comment"><i class="fas fa-paper-plane"></i></button></div></div>' : '<div style="text-align:center;padding:8px 0;"><a href="pages/login.html" style="color:var(--accent);font-size:13px;">Log in to comment</a></div>') +
    '<div id="comments-list-' + creationId + '"><div class="comments-empty"><i class="far fa-comment-dots"></i>Be the first to comment</div></div>' +
    '<div id="comments-loadmore-' + creationId + '"></div>';

  if (isAuth) {
    var avEl = container.querySelector('#comment-avatar-' + creationId);
    if (avEl) {
      var me = await getCurrentProfile();
      avEl.innerHTML = getCreationUserAvatar(me, 32);
    }
    var input = container.querySelector('#comment-input-' + creationId);
    if (input) {
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') postNewComment(creationId);
      });
    }
  }

  await loadComments(creationId, 0);
}

var _commentsLoaded = {};
async function loadComments(creationId, offset) {
  var listEl = document.getElementById('comments-list-' + creationId);
  var loadMoreEl = document.getElementById('comments-loadmore-' + creationId);
  if (!listEl) return;

  var comments = await getComments(creationId, 10, offset);
  if (offset === 0) {
    listEl.innerHTML = '';
    _commentsLoaded[creationId] = 0;
  }

  if (comments.length === 0 && offset === 0) {
    listEl.innerHTML = '<div class="comments-empty"><i class="far fa-comment-dots"></i>Be the first to comment</div>';
    if (loadMoreEl) loadMoreEl.innerHTML = '';
    return;
  }

  var commentIds = comments.map(function(c) { return c.id; });
  var myLiked = await getMyLikedCommentIds(commentIds);

  for (var i = 0; i < comments.length; i++) {
    var c = comments[i];
    var isOwnComment = false;
    var session = await getSession();
    if (session && session.user) isOwnComment = c.user_id === session.user.id;
    var likeCount = await getCommentLikeCount(c.id);
    var isLiked = !!myLiked[c.id];

    var el = document.createElement('div');
    el.innerHTML = renderCommentHtml(c, creationId, isOwnComment, likeCount, isLiked);
    while (el.firstChild) listEl.appendChild(el.firstChild);

    // Load replies
    var replies = await getReplies(c.id);
    if (replies.length > 0) {
      var replyIds = replies.map(function(r) { return r.id; });
      var myLikedReplies = await getMyLikedCommentIds(replyIds);
      var repliesContainer = document.createElement('div');
      repliesContainer.className = 'comment-replies';
      repliesContainer.id = 'replies-' + c.id;
      for (var j = 0; j < replies.length; j++) {
        var r = replies[j];
        var rIsOwn = session && session.user && r.user_id === session.user.id;
        var rLikeCount = await getCommentLikeCount(r.id);
        var rIsLiked = !!myLikedReplies[r.id];
        var rEl = document.createElement('div');
        rEl.innerHTML = renderCommentHtml(r, creationId, rIsOwn, rLikeCount, rIsLiked);
        while (rEl.firstChild) repliesContainer.appendChild(rEl.firstChild);
      }
      var parentComment = listEl.querySelector('[data-comment-id="' + c.id + '"] .comment-body');
      if (parentComment) parentComment.appendChild(repliesContainer);
    }
  }

  _commentsLoaded[creationId] = offset + comments.length;

  if (comments.length >= 10 && loadMoreEl) {
    loadMoreEl.innerHTML = '<button class="load-more-btn" onclick="loadComments(\'' + creationId + '\', ' + (offset + 10) + ')">Load more comments</button>';
  } else if (loadMoreEl) {
    loadMoreEl.innerHTML = '';
  }
}

function renderCommentHtml(comment, creationId, isOwn, likeCount, isLiked) {
  var profile = comment.profiles || {};
  var userName = getCreationUserName(profile);
  var editDeleteHtml = '';
  if (isOwn) {
    editDeleteHtml = '<button onclick="editCommentUI(\'' + comment.id + '\', \'' + creationId + '\')">Edit</button> <button onclick="deleteCommentConfirm(\'' + comment.id + '\', \'' + creationId + '\')">Delete</button>';
  }

  return '<div class="comment-item" data-comment-id="' + comment.id + '">' +
    '<div class="comment-avatar"><a href="profile.html?user=' + (profile.username || '') + '" style="text-decoration:none;">' + getCreationUserAvatar(profile, 32) + '</a></div>' +
    '<div class="comment-body">' +
      '<span class="comment-user">' + userName + '</span>' +
      '<div class="comment-text" id="comment-text-' + comment.id + '">' + postEscapeHtml(comment.content) + '</div>' +
      '<div class="comment-meta">' +
        '<span>' + timeAgo(comment.created_at) + '</span>' +
        '<button class="comment-like-btn' + (isLiked ? ' liked' : '') + '" onclick="handleCommentLike(\'' + comment.id + '\', this)"><i class="fa' + (isLiked ? 's' : 'r') + ' fa-heart"></i> <span>' + (likeCount || '') + '</span></button>' +
        '<button onclick="showReplyInput(\'' + comment.id + '\', \'' + creationId + '\')">Reply</button>' +
        editDeleteHtml +
      '</div>' +
      '<div id="reply-input-' + comment.id + '"></div>' +
    '</div>' +
  '</div>';
}

/* ---- POST NEW COMMENT ---- */
async function postNewComment(creationId) {
  var input = document.getElementById('comment-input-' + creationId);
  if (!input) return;
  var content = input.value.trim();
  if (!content) return;

  input.disabled = true;
  try {
    await postComment(creationId, content);
    input.value = '';
    var countEl = document.querySelector('#detail-overlay-' + creationId + ' .action-comment-count');
    if (countEl) countEl.textContent = parseInt(countEl.textContent || '0') + 1;
    await loadComments(creationId, 0);
  } catch(e) {
    if (typeof showToast === 'function') showToast(e.message, 'error');
  } finally {
    input.disabled = false;
  }
}

/* ---- REPLY INPUT ---- */
function showReplyInput(commentId, creationId) {
  var container = document.getElementById('reply-input-' + commentId);
  if (!container) return;
  if (container.innerHTML) { container.innerHTML = ''; return; }
  container.innerHTML = '<div class="reply-input-row"><input type="text" id="reply-text-' + commentId + '" placeholder="Write a reply..." maxlength="1000"><button onclick="postReply(\'' + commentId + '\', \'' + creationId + '\')"><i class="fas fa-paper-plane"></i></button></div>';
  var input = document.getElementById('reply-text-' + commentId);
  if (input) {
    input.focus();
    input.addEventListener('keydown', function(e) { if (e.key === 'Enter') postReply(commentId, creationId); });
  }
}

async function postReply(parentId, creationId) {
  var input = document.getElementById('reply-text-' + parentId);
  if (!input) return;
  var content = input.value.trim();
  if (!content) return;

  try {
    await postComment(creationId, content, parentId);
    await loadComments(creationId, 0);
  } catch(e) {
    if (typeof showToast === 'function') showToast(e.message, 'error');
  }
}

/* ---- EDIT COMMENT ---- */
async function editCommentUI(commentId, creationId) {
  var textEl = document.getElementById('comment-text-' + commentId);
  if (!textEl) return;
  var originalText = textEl.textContent;
  textEl.innerHTML = '<div><input class="edit-comment-input" id="edit-cmt-input-' + commentId + '" value="' + originalText.replace(/"/g, '&quot;') + '" maxlength="1000"></div><div class="edit-comment-actions"><button class="save-btn" onclick="saveCommentEdit(\'' + commentId + '\', \'' + creationId + '\')">Save</button> <button class="cancel-btn" onclick="loadComments(\'' + creationId + '\', 0)">Cancel</button></div>';
  document.getElementById('edit-cmt-input-' + commentId).focus();
}

async function saveCommentEdit(commentId, creationId) {
  var input = document.getElementById('edit-cmt-input-' + commentId);
  if (!input) return;
  var content = input.value.trim();
  if (!content) return;
  try {
    await editComment(commentId, content);
    await loadComments(creationId, 0);
  } catch(e) {
    if (typeof showToast === 'function') showToast(e.message, 'error');
  }
}

/* ---- DELETE COMMENT ---- */
async function deleteCommentConfirm(commentId, creationId) {
  if (!confirm('Delete this comment? This cannot be undone.')) return;
  try {
    await deleteComment(commentId);
    var countEl = document.querySelector('#detail-overlay-' + creationId + ' .action-comment-count');
    if (countEl) countEl.textContent = Math.max(0, parseInt(countEl.textContent || '1') - 1);
    await loadComments(creationId, 0);
  } catch(e) {
    if (typeof showToast === 'function') showToast(e.message, 'error');
  }
}

/* ---- COMMENT LIKE HANDLER ---- */
async function handleCommentLike(commentId, btn) {
  if (!btn) return;
  var session = await getSession();
  if (!session) return;

  var prevLiked = btn.classList.contains('liked');
  var countEl = btn.querySelector('span');
  var prevCount = parseInt(countEl.textContent) || 0;

  btn.classList.toggle('liked');
  var iconEl = btn.querySelector('i');
  iconEl.className = btn.classList.contains('liked') ? 'fas fa-heart' : 'far fa-heart';
  countEl.textContent = btn.classList.contains('liked') ? prevCount + 1 : Math.max(0, prevCount - 1);

  try {
    await toggleCommentLike(commentId);
  } catch(e) {
    btn.classList.toggle('liked');
    iconEl.className = prevLiked ? 'fas fa-heart' : 'far fa-heart';
    countEl.textContent = prevCount;
  }
}
