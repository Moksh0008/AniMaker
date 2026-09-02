/* =========================================================
   AniMaker — Posts System (Supabase)
   
   Reusable functions for creating, reading, updating,
   deleting posts and uploading media to Supabase Storage.
   ========================================================= */

/* ---- Constants ---- */
var POST_CATEGORIES = [
  'Creator',
  'Writer',
  'Maker'
];

var VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
var VALID_VIDEO_TYPES = ['video/mp4', 'video/webm'];
var MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
var MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

/* ---- Upload media to Supabase Storage ---- */
async function uploadPostMedia(file, onProgress) {
  if (!supabaseClient) throw new Error('Supabase not available');

  var session = await getSession();
  if (!session || !session.user) throw new Error('Not authenticated');

  // Validate file type
  var isImage = VALID_IMAGE_TYPES.includes(file.type);
  var isVideo = VALID_VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    throw new Error('Unsupported file type. Please upload JPG, PNG, WEBP, GIF, MP4, or WEBM.');
  }

  // Validate file size
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

  // Upload with progress tracking via XMLHttpRequest
  var storageUrl = (supabaseClient.supabaseUrl || '') + '/storage/v1/object';
  var apiKey = '';
  try { apiKey = supabaseClient._headers?.apikey || ''; } catch {}
  if (!apiKey) {
    // Fallback: use Supabase SDK upload without progress
    var { data, error } = await supabaseClient.storage.from('post-media').upload(filePath, file, { cacheControl: '3600', upsert: false });
    if (error) throw new Error(error.message || 'Upload failed');
    var publicUrl = supabaseClient.supabaseUrl + '/storage/v1/object/public/post-media/' + filePath;
    return { url: publicUrl, type: isImage ? 'image' : 'video', path: filePath };
  }

  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', storageUrl + '/post-media/' + filePath);

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
        var publicUrl = (supabaseClient.supabaseUrl || '') + '/storage/v1/object/public/post-media/' + filePath;
        resolve({ url: publicUrl, type: isImage ? 'image' : 'video', path: filePath });
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

/* ---- Delete media from Supabase Storage ---- */
async function deletePostMedia(filePath) {
  if (!supabaseClient || !filePath) return;
  try {
    await supabaseClient.storage.from('post-media').remove([filePath]);
  } catch {}
}

/* ---- Create a post ---- */
async function createPost(postData) {
  if (!supabaseClient) throw new Error('Supabase not available');

  var session = await getSession();
  if (!session || !session.user) throw new Error('Not authenticated');

  var { data, error } = await supabaseClient
    .from('posts')
    .insert({
      user_id: session.user.id,
      title: postData.title || '',
      caption: postData.caption || '',
      media_url: postData.media_url,
      media_type: postData.media_type,
      category: postData.category || 'Other'
    })
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to create post');
  return data;
}

/* ---- Fetch posts (feed) ---- */
async function fetchPosts(options) {
  if (!supabaseClient) return [];

  options = options || {};
  var limit = options.limit || 20;
  var offset = options.offset || 0;
  var userId = options.userId || null;
  var category = options.category || null;

  var query = supabaseClient
    .from('posts')
    .select('*, profiles:user_id(username, full_name, avatar_url, role)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (userId) {
    query = query.eq('user_id', userId);
  }
  if (category) {
    query = query.eq('category', category);
  }

  var { data, error } = await query;
  if (error) {
    console.error('[AniMaker] fetchPosts error:', error.message);
    return [];
  }
  return data || [];
}

/* ---- Fetch single post ---- */
async function fetchPost(postId) {
  if (!supabaseClient) return null;

  var { data, error } = await supabaseClient
    .from('posts')
    .select('*, profiles:user_id(username, full_name, avatar_url, role)')
    .eq('id', postId)
    .single();

  if (error) return null;
  return data;
}

/* ---- Update a post ---- */
async function updatePost(postId, updates) {
  if (!supabaseClient) throw new Error('Supabase not available');

  var session = await getSession();
  if (!session || !session.user) throw new Error('Not authenticated');

  var { data, error } = await supabaseClient
    .from('posts')
    .update({
      title: updates.title,
      caption: updates.caption,
      category: updates.category
    })
    .eq('id', postId)
    .eq('user_id', session.user.id)
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to update post');
  return data;
}

/* ---- Delete a post ---- */
async function deletePost(postId) {
  if (!supabaseClient) throw new Error('Supabase not available');

  var session = await getSession();
  if (!session || !session.user) throw new Error('Not authenticated');

  // Get post to find media path
  var post = await fetchPost(postId);
  if (!post) throw new Error('Post not found');
  if (post.user_id !== session.user.id) throw new Error('You can only delete your own posts');

  // Delete media from storage
  if (post.media_url) {
    var path = post.media_url.split('/object/public/post-media/')[1];
    if (path) await deletePostMedia(path);
  }

  // Delete post record
  var { error } = await supabaseClient
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', session.user.id);

  if (error) throw new Error(error.message || 'Failed to delete post');
  return true;
}

/* ---- Count posts for a user ---- */
async function countUserPosts(userId) {
  if (!supabaseClient) return 0;

  var { count, error } = await supabaseClient
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) return 0;
  return count || 0;
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
