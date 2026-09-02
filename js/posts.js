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

  var storageUrl = (supabaseClient.supabaseUrl || '') + '/storage/v1/object';
  var apiKey = '';
  try { apiKey = supabaseClient._headers?.apikey || ''; } catch(e) {}

  if (!apiKey) {
    var { data, error } = await supabaseClient.storage.from(bucket).upload(filePath, file, { cacheControl: '3600', upsert: false });
    if (error) throw new Error(error.message || 'Upload failed');
    var publicUrl = supabaseClient.supabaseUrl + '/storage/v1/object/public/' + bucket + '/' + filePath;
    return { url: publicUrl, path: filePath };
  }

  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', storageUrl + '/' + bucket + '/' + filePath);
    xhr.setRequestHeader('apikey', apiKey);
    xhr.setRequestHeader('Authorization', 'Bearer ' + session.access_token);

    if (onProgress) {
      xhr.upload.addEventListener('progress', function(e) {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
    }

    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        var publicUrl = (supabaseClient.supabaseUrl || '') + '/storage/v1/object/public/' + bucket + '/' + filePath;
        resolve({ url: publicUrl, path: filePath });
      } else {
        reject(new Error('Upload failed: ' + (xhr.statusText || 'Server error')));
      }
    };

    xhr.onerror = function() {
      reject(new Error('Network error during upload.'));
    };

    xhr.send(file);
  });
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

  var { data, error } = await supabaseClient
    .from('creations')
    .update({
      title: updates.title,
      description: updates.description,
      cover_image_url: updates.cover_image_url,
      story_content: updates.story_content
    })
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
  if (creation.type === 'creator' && creation.cover_image_url) {
    var imgPath = extractStoragePath(creation.cover_image_url, 'creations');
    if (imgPath) await deleteCreationFile('creations', imgPath);
  }
  if (creation.type === 'maker') {
    if (creation.media_url) {
      var vidPath = extractStoragePath(creation.media_url, 'maker-videos');
      if (vidPath) await deleteCreationFile('maker-videos', vidPath);
    }
    if (creation.cover_image_url) {
      var thumbPath = extractStoragePath(creation.cover_image_url, 'maker-thumbnails');
      if (thumbPath) await deleteCreationFile('maker-thumbnails', thumbPath);
    }
  }
  if (creation.type === 'writer' && creation.cover_image_url) {
    var coverPath = extractStoragePath(creation.cover_image_url, 'creations');
    if (coverPath) await deleteCreationFile('creations', coverPath);
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

/* ---- Detail View Functions ---- */

function openCreatorDetail(id) {
  fetchCreation(id).then(function(c) {
    if (!c) return;
    var profile = c.profiles || {};
    var overlay = document.createElement('div');
    overlay.className = 'detail-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = '<button class="detail-close" onclick="this.parentElement.remove()"><i class="fas fa-xmark"></i></button>' +
      '<div class="creator-detail">' +
        '<div class="creator-detail-image"><img src="' + (c.cover_image_url || '') + '"></div>' +
        '<div class="creator-detail-info">' +
          '<div class="creator-detail-header">' + getCreationUserAvatar(profile, 40) + '<div class="user-info"><div class="name">' + getCreationUserName(profile) + '</div><div class="type">Creator</div></div></div>' +
          '<div class="creator-detail-body">' +
            '<div class="creator-detail-title">' + postEscapeHtml(c.title) + '</div>' +
            '<div class="creator-detail-desc">' + postEscapeHtml(c.description || '').replace(/\n/g, '<br>') + '</div>' +
            '<div class="creator-detail-time">' + timeAgo(c.created_at) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
  });
}

function openStoryDetail(id) {
  fetchCreation(id).then(function(c) {
    if (!c) return;
    var profile = c.profiles || {};
    var overlay = document.createElement('div');
    overlay.className = 'detail-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = '<button class="detail-close" onclick="this.parentElement.remove()"><i class="fas fa-xmark"></i></button>' +
      '<div class="story-detail">' +
        (c.cover_image_url ? '<img class="story-detail-cover" src="' + c.cover_image_url + '">' : '') +
        '<div class="story-detail-body">' +
          '<div class="story-detail-title">' + postEscapeHtml(c.title) + '</div>' +
          '<div class="story-detail-author">' + getCreationUserAvatar(profile, 40) + '<div><div class="author-name">' + getCreationUserName(profile) + '</div><div class="author-meta">' + estimateReadingTime(c.story_content) + '</div></div></div>' +
          '<div class="story-detail-content">' + postEscapeHtml(c.story_content || '').replace(/\n/g, '<br>') + '</div>' +
          '<div class="story-detail-footer"><span>' + timeAgo(c.created_at) + '</span></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
  });
}

function openMakerDetail(id) {
  fetchCreation(id).then(function(c) {
    if (!c) return;
    var profile = c.profiles || {};
    var overlay = document.createElement('div');
    overlay.className = 'detail-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) { var v = overlay.querySelector('video'); if (v) v.pause(); overlay.remove(); } };
    overlay.innerHTML = '<button class="detail-close" onclick="var v=this.parentElement.querySelector(\'video\');if(v)v.pause();this.parentElement.remove()"><i class="fas fa-xmark"></i></button>' +
      '<div class="maker-detail">' +
        '<video src="' + (c.media_url || '') + '" controls playsinline></video>' +
        '<div class="maker-detail-info">' +
          '<div class="maker-detail-title">' + postEscapeHtml(c.title) + '</div>' +
          (c.description ? '<div class="maker-detail-desc">' + postEscapeHtml(c.description).replace(/\n/g, '<br>') + '</div>' : '') +
          '<div class="maker-detail-author">' + getCreationUserAvatar(profile, 40) + '<div><div class="author-name">' + getCreationUserName(profile) + '</div><div class="author-meta">' + timeAgo(c.created_at) + '</div></div></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
  });
}
