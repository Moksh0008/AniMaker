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

/* ---- Default creation → random user map ---- */
var DEFAULT_USER_MAP = {
  // Creator defaults
  'A Fusion of Naruto and Goku': { username: 'AkiraSensei', full_name: 'AkiraSensei', avatar_url: '../assets/images/avatars/anime-avatar-1.jpg' },
  'Super Saiyan Nine Tails': { username: 'NarutoFan99', full_name: 'NarutoFan99', avatar_url: '../assets/images/avatars/anime-avatar-2.jpg' },
  'Gear 5 Goku': { username: 'SaiyanArtist', full_name: 'SaiyanArtist', avatar_url: '../assets/images/avatars/anime-avatar-3.jpg' },
  'Ichigo Naruto': { username: 'LuffyLover', full_name: 'LuffyLover', avatar_url: '../assets/images/avatars/anime-avatar-4.jpg' },
  'Creation 5': { username: 'IchigoInk', full_name: 'IchigoInk', avatar_url: '../assets/images/avatars/anime-avatar-5.jpg' },
  'Vegetto': { username: 'ZoroDraws', full_name: 'ZoroDraws', avatar_url: '../assets/images/avatars/anime-avatar-6.jpg' },
  'Gear 5 Baryon': { username: 'Gear5Creator', full_name: 'Gear5Creator', avatar_url: '../assets/images/avatars/avatar-1.jpg' },
  'Lugoto': { username: 'AkatsukiArt', full_name: 'AkatsukiArt', avatar_url: '../assets/images/avatars/avatar-2.jpg' },
  // Writer defaults
  'Luffy as Lil Bro of Goku': { username: 'StoryWeaver', full_name: 'StoryWeaver', avatar_url: '../assets/images/avatars/anime-avatar-9.png' },
  'Goats as a Trio': { username: 'AnimeScribe', full_name: 'AnimeScribe', avatar_url: '../assets/images/avatars/anime-avatar-10.png' },
  'Ramen Lovers Together': { username: 'MangaWriter', full_name: 'MangaWriter', avatar_url: '../assets/images/avatars/anime-avatar-11.png' },
  'The Last Battle': { username: 'NinjaNarrator', full_name: 'NinjaNarrator', avatar_url: '../assets/images/avatars/anime-avatar-12.png' },
  'Team Goats': { username: 'PiratePoet', full_name: 'PiratePoet', avatar_url: '../assets/images/avatars/anime-avatar-13.png' },
  'Jack Luffy': { username: 'SaiyanStories', full_name: 'SaiyanStories', avatar_url: '../assets/images/avatars/anime-avatar-14.png' },
  'Pirate Slayer': { username: 'ShonenAuthor', full_name: 'ShonenAuthor', avatar_url: '../assets/images/avatars/anime-avatar-15.png' },
  'Unbeatable Combo': { username: 'AnimeWriter', full_name: 'AnimeWriter', avatar_url: '../assets/images/avatars/anime-avatar-16.png' },
  // Maker defaults
  'Nine Tails VS Gear 5': { username: 'AnimeVFX', full_name: 'AnimeVFX', avatar_url: '../assets/images/avatars/anime-avatar-17.png' },
  'Battle of G.OA.Ts': { username: 'ShonenStudio', full_name: 'ShonenStudio', avatar_url: '../assets/images/avatars/avatar-3.jpg' },
  'Battle of G.O.A.T.s': { username: 'ShonenStudio', full_name: 'ShonenStudio', avatar_url: '../assets/images/avatars/avatar-3.jpg' },
  'Dominance of Aizen': { username: 'NinjaAnimate', full_name: 'NinjaAnimate', avatar_url: '../assets/images/avatars/avatar-4.jpg' },
  'Battle of Instant': { username: 'PirateFrames', full_name: 'PirateFrames', avatar_url: '../assets/images/avatars/avatar-5.jpg' },
  'Clash of Legends': { username: 'SaiyanMotion', full_name: 'SaiyanMotion', avatar_url: '../assets/images/avatars/avatar-6.jpg' },
  'The New Member of Akatsuki': { username: 'HollowAnime', full_name: 'HollowAnime', avatar_url: '../assets/images/avatars/avatar-7.jpg' },
  'The End of Muzan': { username: 'DemonSlayerFX', full_name: 'DemonSlayerFX', avatar_url: '../assets/images/avatars/avatar-8.jpg' },
  'Fight of Senseis': { username: 'JujutsuStudio', full_name: 'JujutsuStudio', avatar_url: '../assets/images/avatars/avatar-9.jpg' },
  'The END': { username: 'FinalCutAnime', full_name: 'FinalCutAnime', avatar_url: '../assets/images/avatars/avatar-10.jpg' }
};

function getDefaultUser(creation) {
  if (!creation || !creation.title) return null;
  return DEFAULT_USER_MAP[creation.title] || null;
}

/* ---- Predefined profiles for default users ---- */
var DEFAULT_PROFILES = [
  // Creator profiles
  { id: 'default-p-akirasensei', username: 'AkiraSensei', full_name: 'Akira Sensei', avatar_url: '../assets/images/avatars/anime-avatar-1.jpg', bio: 'Anime artist & Dragon Ball enthusiast. Creating epic crossover art daily. 🐉⚡', created_at: '2025-11-15T08:00:00Z', role: 'Creator' },
  { id: 'default-p-narutofan99', username: 'NarutoFan99', full_name: 'Naruto Fan 99', avatar_url: '../assets/images/avatars/anime-avatar-2.jpg', bio: 'Believe it! Naruto universe is my canvas. Shippuden forever. 🍥🦊', created_at: '2025-12-01T10:30:00Z', role: 'Creator' },
  { id: 'default-p-saiyanartist', username: 'SaiyanArtist', full_name: 'Saiyan Artist', avatar_url: '../assets/images/avatars/anime-avatar-3.jpg', bio: 'Drawing Saiyans at full power. Super Saiyan transformations are my specialty. 💪🔥', created_at: '2025-10-20T14:15:00Z', role: 'Creator' },
  { id: 'default-p-luffylover', username: 'LuffyLover', full_name: 'Luffy Lover', avatar_url: '../assets/images/avatars/anime-avatar-4.jpg', bio: 'One Piece fan art & pirate vibes. Waiting for the One Piece. 🏴‍☠️👒', created_at: '2026-01-05T09:45:00Z', role: 'Creator' },
  { id: 'default-p-ichigoink', username: 'IchigoInk', full_name: 'Ichigo Ink', avatar_url: '../assets/images/avatars/anime-avatar-5.jpg', bio: 'Bleach-inspired illustrations. Zangetsu never dulls. ⚔️🍊', created_at: '2025-09-18T16:20:00Z', role: 'Creator' },
  { id: 'default-p-zorodraws', username: 'ZoroDraws', full_name: 'Zoro Draws', avatar_url: '../assets/images/avatars/anime-avatar-6.jpg', bio: 'Three-sword style art. Lost my way to art school but found my path. 🗡️🟢', created_at: '2025-08-22T11:10:00Z', role: 'Creator' },
  { id: 'default-p-gear5creator', username: 'Gear5Creator', full_name: 'Gear 5 Creator', avatar_url: '../assets/images/avatars/avatar-1.jpg', bio: 'Pushing the limits of anime creation. Gear 5 era. ☀️ rubber powers', created_at: '2026-02-14T07:30:00Z', role: 'Creator' },
  { id: 'default-p-akatsukiart', username: 'AkatsukiArt', full_name: 'Akatsuki Art', avatar_url: '../assets/images/avatars/avatar-2.jpg', bio: 'Embracing the darkness. Akatsuki-themed art & shonen vibes. 🌙☁️', created_at: '2025-07-30T13:00:00Z', role: 'Creator' },
  // Writer profiles
  { id: 'default-p-storyweaver', username: 'StoryWeaver', full_name: 'Story Weaver', avatar_url: '../assets/images/avatars/anime-avatar-9.png', bio: 'Weaving tales across dimensions. Where imagination meets ink. ✍️📖', created_at: '2025-11-10T08:00:00Z', role: 'Writer' },
  { id: 'default-p-animescribe', username: 'AnimeScribe', full_name: 'Anime Scribe', avatar_url: '../assets/images/avatars/anime-avatar-10.png', bio: 'Recording the legends of anime. Every story deserves to be told. 📝🎌', created_at: '2025-12-05T10:00:00Z', role: 'Writer' },
  { id: 'default-p-mangawriter', username: 'MangaWriter', full_name: 'Manga Writer', avatar_url: '../assets/images/avatars/anime-avatar-11.png', bio: 'Manga-inspired storytelling. From panel to prose. 📚✨', created_at: '2026-01-12T14:30:00Z', role: 'Writer' },
  { id: 'default-p-ninjanarrator', username: 'NinjaNarrator', full_name: 'Ninja Narrator', avatar_url: '../assets/images/avatars/anime-avatar-12.png', bio: 'Shadows and stories. Narrating the ninja way. 🥷🌙', created_at: '2025-09-25T09:15:00Z', role: 'Writer' },
  { id: 'default-p-piratepoet', username: 'PiratePoet', full_name: 'Pirate Poet', avatar_url: '../assets/images/avatars/anime-avatar-13.png', bio: 'Poetry from the Grand Line. Every adventure is a verse. ⛵🌊', created_at: '2025-10-18T12:45:00Z', role: 'Writer' },
  { id: 'default-p-saiyanstories', username: 'SaiyanStories', full_name: 'Saiyan Stories', avatar_url: '../assets/images/avatars/anime-avatar-14.png', bio: 'Tales of Saiyan warriors across the universe. Power levels rising. 📖💥', created_at: '2026-02-01T08:20:00Z', role: 'Writer' },
  { id: 'default-p-shonenauthor', username: 'ShonenAuthor', full_name: 'Shonen Author', avatar_url: '../assets/images/avatars/anime-avatar-15.png', bio: 'Weekly shonen storytelling. Friendship, effort, victory! 🔥👊', created_at: '2025-08-15T15:00:00Z', role: 'Writer' },
  { id: 'default-p-animewriter', username: 'AnimeWriter', full_name: 'Anime Writer', avatar_url: '../assets/images/avatars/anime-avatar-16.png', bio: 'Bringing anime worlds to life through words. Chapter by chapter. ✏️🌸', created_at: '2025-12-20T11:30:00Z', role: 'Writer' },
  // Maker profiles
  { id: 'default-p-animevfx', username: 'AnimeVFX', full_name: 'Anime VFX', avatar_url: '../assets/images/avatars/anime-avatar-17.png', bio: 'Visual effects artist. Making anime fights feel real. 🎬✨', created_at: '2025-11-25T07:00:00Z', role: 'Maker' },
  { id: 'default-p-shonenstudio', username: 'ShonenStudio', full_name: 'Shonen Studio', avatar_url: '../assets/images/avatars/avatar-3.jpg', bio: 'Studio-grade animations inspired by shonen anime. Frame by frame. 🎞️🔥', created_at: '2026-01-08T13:15:00Z', role: 'Maker' },
  { id: 'default-p-ninjaanimate', username: 'NinjaAnimate', full_name: 'Ninja Animate', avatar_url: '../assets/images/avatars/avatar-4.jpg', bio: 'Ninja-speed animations. From concept to screen in record time. 🥷🎥', created_at: '2025-10-02T10:00:00Z', role: 'Maker' },
  { id: 'default-p-pirateframes', username: 'PirateFrames', full_name: 'Pirate Frames', avatar_url: '../assets/images/avatars/avatar-5.jpg', bio: 'Frame-by-frame pirate adventures. Sailing the seas of animation. ⚓🎬', created_at: '2025-12-15T09:30:00Z', role: 'Maker' },
  { id: 'default-p-saiyanmotion', username: 'SaiyanMotion', full_name: 'Saiyan Motion', avatar_url: '../assets/images/avatars/avatar-6.jpg', bio: 'Motion graphics meets Saiyan power. Every frame is a battle. 💫⚡', created_at: '2026-02-10T14:00:00Z', role: 'Maker' },
  { id: 'default-p-hollowanime', username: 'HollowAnime', full_name: 'Hollow Anime', avatar_url: '../assets/images/avatars/avatar-7.jpg', bio: 'Hollow-fied animations. Bleach-inspired motion art. ☠️🌀', created_at: '2025-09-08T16:45:00Z', role: 'Maker' },
  { id: 'default-p-demonslayerfx', username: 'DemonSlayerFX', full_name: 'Demon Slayer FX', avatar_url: '../assets/images/avatars/avatar-8.jpg', bio: 'Breathing techniques brought to life. Demon Slayer VFX studio. 🗡️🔥', created_at: '2025-11-01T11:00:00Z', role: 'Maker' },
  { id: 'default-p-jujutsustudio', username: 'JujutsuStudio', full_name: 'Jujutsu Studio', avatar_url: '../assets/images/avatars/avatar-9.jpg', bio: 'Cursed energy animations. Jujutsu Kaisen-inspired motion work. 👁️⚡', created_at: '2026-01-20T08:00:00Z', role: 'Maker' },
  { id: 'default-p-finalcutanime', username: 'FinalCutAnime', full_name: 'Final Cut Anime', avatar_url: '../assets/images/avatars/avatar-10.jpg', bio: 'Final cuts, final forms. Anime edits & compilations. 🎬🎞️', created_at: '2025-08-05T12:30:00Z', role: 'Maker' }
];

function getDefaultProfile(username) {
  if (!username) return null;
  for (var i = 0; i < DEFAULT_PROFILES.length; i++) {
    if (DEFAULT_PROFILES[i].username === username) return DEFAULT_PROFILES[i];
  }
  return null;
}

function isDefaultUser(username) {
  return getDefaultProfile(username) !== null;
}

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

  var uploadUrl = supabaseClient.supabaseUrl + '/storage/v1/object/' + bucket + '/' + filePath;

  var response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'apikey': supabaseClient.supabaseKey,
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

/* ---- Utility: resolve legacy root-relative asset paths ----
   Old seeded rows store covers as 'assets/...' which only resolves
   from the site root; pages live in /pages/, so rewrite at render. */
function resolveAssetUrl(url) {
  if (!url) return url;
  if (url.indexOf('assets/') === 0 && window.location.pathname.indexOf('/pages/') !== -1) {
    return '../' + url;
  }
  return url;
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
    return '<img src="' + profile.avatar_url + '" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;"><div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:var(--accent);display:none;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:' + (size * 0.4) + 'px;">' + (profile.full_name || profile.username || 'U').charAt(0).toUpperCase() + '</div>';
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

function openCreatorDetail(id, userOverride) {
  fetchCreation(id).then(async function(c) {
    if (!c) return;
    var profile = userOverride || getDefaultUser(c) || c.profiles || {};
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
        '<div class="creator-popup-image"><img src="' + resolveAssetUrl(c.cover_image_url || '') + '"></div>' +
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
            '<button class="creation-action-btn' + (saved ? ' saved' : '') + '" data-save-for="' + id + '" onclick="handleSave(\'' + id + '\', this)">' +
              '<i class="fa' + (saved ? 's' : 'r') + ' fa-bookmark"></i> <span>' + (saved ? 'Saved' : 'Save') + '</span>' +
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

function openStoryDetail(id, userOverride) {
  fetchCreation(id).then(async function(c) {
    if (!c) return;
    var id = c.id;
    var profile = userOverride || getDefaultUser(c) || c.profiles || {};
    var session = await getSession();
    var isOwn = session && session.user && c.user_id === session.user.id;

    var likeCount = 0, commentCount = 0, liked = false, saved = false, followingUser = false;
    likeCount = await getLikeCount(id);
    commentCount = await getCommentCount(id);
    liked = await hasUserLiked(id);
    saved = await hasUserSaved(id);
    followingUser = !isOwn && session ? await isFollowing(c.user_id) : false;

    var followBtnHtml = '';
    if (!isOwn && session) {
      followBtnHtml = '<button class="follow-btn ' + (followingUser ? 'following' : 'follow') + '" onclick="handleFollow(\'' + c.user_id + '\', this)">' + (followingUser ? '<i class="fas fa-check"></i> Following' : '<i class="fas fa-plus"></i> Follow') + '</button>';
    }

    // Meta chips: genre + tags + reading time
    var metaBits = [];
    if (c.genre) metaBits.push('<span class="writer-meta-chip writer-genre-chip"><i class="fas fa-book-open"></i> ' + postEscapeHtml(c.genre) + '</span>');
    if (Array.isArray(c.tags)) {
      c.tags.slice(0, 6).forEach(function(t) {
        if (t) metaBits.push('<span class="writer-meta-chip">#' + postEscapeHtml(String(t)) + '</span>');
      });
    }
    var metaHtml = metaBits.length ? '<div class="writer-meta-row">' + metaBits.join('') + '</div>' : '';

    var readingTime = estimateReadingTime(c.story_content);
    var publishedDate = '';
    if (c.created_at) {
      try { publishedDate = new Date(c.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); } catch (e) { publishedDate = timeAgo(c.created_at); }
    } else {
      publishedDate = 'Sample story';
    }

    var coverHtml = c.cover_image_url
      ? '<div class="writer-hero-cover"><img src="' + resolveAssetUrl(c.cover_image_url) + '" alt="' + postEscapeHtml(c.title) + '" onerror="this.parentElement.classList.add(\'writer-hero-cover-empty\');this.remove();"><i class=\"fas fa-feather-pointed\" style=\"display:none;\"></i></div>'
      : '<div class="writer-hero-cover writer-hero-cover-empty"><i class="fas fa-feather-pointed"></i></div>';

    var overlay = document.createElement('div');
    overlay.className = 'detail-overlay writer-overlay';
    overlay.id = 'detail-overlay-' + id;
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML =
      '<button class="writer-close-btn" aria-label="Close" onclick="this.closest(\'.writer-overlay\').remove()"><i class="fas fa-xmark"></i></button>' +
      '<article class="writer-popup" role="dialog" aria-label="Story reader">' +

        /* ---- Hero header: cover left, story info right ---- */
        '<header class="writer-hero">' +
          coverHtml +
          '<div class="writer-hero-info">' +
            '<div class="writer-hero-author">' +
              '<a href="profile.html?user=' + (profile.username || '') + '" style="text-decoration:none;">' + getCreationUserAvatar(profile, 44) + '</a>' +
              '<div class="writer-hero-author-text">' +
                '<a href="profile.html?user=' + (profile.username || '') + '" style="text-decoration:none;"><span class="writer-hero-author-name">' + getCreationUserName(profile) + '</span></a>' +
                '<span class="writer-hero-author-role"><i class="fas fa-pen-nib"></i> Writer</span>' +
              '</div>' +
              followBtnHtml +
            '</div>' +
            '<h1 class="writer-hero-title">' + postEscapeHtml(c.title) + '</h1>' +
            (c.description ? '<p class="writer-hero-desc">' + postEscapeHtml(c.description) + '</p>' : '') +
            metaHtml +
            '<div class="writer-hero-stats">' +
              '<span><i class="far fa-clock"></i> ' + readingTime + '</span>' +
              '<span class="dot">&middot;</span>' +
              '<span><i class="far fa-calendar"></i> ' + publishedDate + '</span>' +
            '</div>' +
          '</div>' +
        '</header>' +

        /* ---- Reading area ---- */
        '<div class="writer-reading">' +
          '<div class="writer-reading-label"><span class="writer-reading-line"></span> Start Reading <span class="writer-reading-line"></span></div>' +
          (c.story_content
            ? '<div class="writer-story-content" id="writer-content-' + id + '">' +
                postEscapeHtml(c.story_content).split(/\n{2,}/).map(function(para) {
                  return para.trim() ? '<p>' + para.replace(/\n/g, '<br>') + '</p>' : '';
                }).join('') +
              '</div>'
            : '<div class="writer-story-content writer-story-empty"><i class="fas fa-feather-pointed"></i><p>The author hasn\'t written any chapters yet.</p></div>') +
          '<div class="writer-reading-end"><span class="writer-reading-line"></span></div>' +
        '</div>' +

        /* ---- Social actions + comments ---- */
        '<div class="writer-actions-panel">' +
          '<div class="creation-action-bar writer-action-bar">' +
            '<button class="creation-action-btn' + (liked ? ' liked' : '') + '" onclick="handleLike(\'' + id + '\', this)">' +
              '<i class="fa' + (liked ? 's' : 'r') + ' fa-heart"></i> <span class="action-like-count">' + likeCount + '</span>' +
            '</button>' +
            '<button class="creation-action-btn" onclick="document.getElementById(\'comments-section-' + id + '\').scrollIntoView({behavior:\'smooth\'})">' +
              '<i class="far fa-comment"></i> <span class="action-comment-count">' + commentCount + '</span>' +
            '</button>' +
            '<button class="creation-action-btn' + (saved ? ' saved' : '') + '" data-save-for="' + id + '" onclick="handleSave(\'' + id + '\', this)">' +
              '<i class="fa' + (saved ? 's' : 'r') + ' fa-bookmark"></i> <span>' + (saved ? 'Saved' : 'Save') + '</span>' +
            '</button>' +
          '</div>' +
          '<div class="comments-section" id="comments-section-' + id + '"></div>' +
        '</div>' +
      '</article>';
    document.body.appendChild(overlay);
    renderCommentsSection(id, overlay.querySelector('.comments-section'));
  });
}

/* ---- Edit own story from the reader (inline, same data + Supabase) ---- */
async function writerEditStory(id) {
  var session = await getSession();
  if (!session) return;
  var c = await fetchCreation(id);
  if (!c || c.user_id !== session.user.id) return;

  var overlay = document.getElementById('detail-overlay-' + id);
  if (!overlay) return;

  var esc = function(s) { return postEscapeHtml(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); };
  var titleEl = overlay.querySelector('.writer-hero-title');
  var descEl = overlay.querySelector('.writer-hero-desc');
  var contentEl = overlay.querySelector('.writer-story-content');
  if (!titleEl || !contentEl) return;

  var editingBar = document.createElement('div');
  editingBar.className = 'writer-edit-bar';
  editingBar.innerHTML =
    '<label>Title<input id="we-title" type="text" value="' + esc(c.title) + '" maxlength="120"></label>' +
    '<label>Summary<input id="we-desc" type="text" value="' + esc(c.description || '') + '" maxlength="300" placeholder="A short summary of your story"></label>' +
    '<label>Genre<input id="we-genre" type="text" value="' + esc(c.genre || '') + '" maxlength="60" placeholder="Fantasy, Sci-fi..."></label>' +
    '<label>Tags (comma separated)<input id="we-tags" type="text" value="' + esc(Array.isArray(c.tags) ? c.tags.join(', ') : (c.tags || '')) + '" placeholder="anime, fanfic"></label>' +
    '<label>Story<textarea id="we-content" rows="12">' + esc(c.story_content || '') + '</textarea></label>' +
    '<div class="writer-edit-actions">' +
      '<button class="writer-edit-cancel" onclick="this.closest(\'.writer-edit-bar\').remove()">Cancel</button>' +
      '<button class="writer-edit-save" id="we-save-btn"><i class="fas fa-check"></i> Save changes</button>' +
    '</div>';

  titleEl.parentNode.insertBefore(editingBar, titleEl);
  titleEl.style.display = 'none';
  if (descEl) descEl.style.display = 'none';
  contentEl.style.display = 'none';

  editingBar.querySelector('#we-save-btn').onclick = async function() {
    var btn = this;
    btn.disabled = true;
    var title = editingBar.querySelector('#we-title').value.trim();
    if (!title) { showToast('Title cannot be empty.', 'error'); btn.disabled = false; return; }
    var tags = editingBar.querySelector('#we-tags').value.split(',').map(function(t) { return t.trim(); }).filter(Boolean);
    try {
      await updateCreation(id, {
        title: title,
        description: editingBar.querySelector('#we-desc').value.trim(),
        genre: editingBar.querySelector('#we-genre').value.trim(),
        tags: tags,
        story_content: editingBar.querySelector('#we-content').value
      });
      showToast('Story updated.', 'success');
      overlay.remove();
      openStoryDetail(id);
    } catch (err) {
      showToast(err.message || 'Failed to update story.', 'error');
      btn.disabled = false;
    }
  };
}

/* ---- Delete own story from the reader ---- */
async function writerDeleteStory(id) {
  if (!confirm('Delete this story? This cannot be undone.')) return;
  try {
    await deleteCreation(id);
    var overlay = document.getElementById('detail-overlay-' + id);
    if (overlay) overlay.remove();
    showToast('Story deleted.', 'success');
    document.dispatchEvent(new CustomEvent('creation:deleted', { detail: { id: id } }));
  } catch (err) {
    showToast(err.message || 'Failed to delete story.', 'error');
  }
}

function openMakerDetail(id, userOverride) {
  fetchCreation(id).then(async function(c) {
    if (!c) return;
    var profile = userOverride || getDefaultUser(c) || c.profiles || {};
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
        '<video src="' + resolveAssetUrl(c.media_url || '') + '" controls playsinline></video>' +
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
            '</button>' +            '<button class="creation-action-btn' + (saved ? ' saved' : '') + '" data-save-for="' + id + '" onclick="handleSave(\'' + id + '\', this)">' +
              '<i class="fa' + (saved ? 's' : 'r') + ' fa-bookmark"></i> <span>' + (saved ? 'Saved' : 'Save') + '</span>' +
            '</button>' +
          '</div>' +
          '<div class="comments-section" id="comments-section-' + id + '"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    renderCommentsSection(id, overlay.querySelector('.comments-section'));
    // Autoplay as soon as the modal opens (user gesture already happened)
    var vid = overlay.querySelector('video');
    if (vid) {
      vid.muted = false;
      var p = vid.play();
      if (p && p.catch) p.catch(function() {
        // Browser blocked unmuted autoplay - retry muted
        vid.muted = true;
        var p2 = vid.play();
        if (p2 && p2.catch) p2.catch(function() {});
      });
    }
  });
}

/* =========================================================
   Social Interaction Handlers
  ========================================================= */

/* ---- LIKE HANDLER ---- */
async function handleLike(creationId, btn) {
  if (!btn) return;
  var session = await getSession();
  if (!session) { var isSubdir = window.location.pathname.includes('/pages/'); window.location.href = (isSubdir ? '' : 'pages/') + 'login.html'; return; }

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
    var nowLiked = await toggleLike(creationId);
    // Notify the creation owner when someone likes their work
    if (nowLiked && typeof createNotification === 'function') {
      try {
        var creation = await fetchCreation(creationId);
        if (creation && creation.user_id) {
          var me = await getCurrentProfile();
          var myName = me ? (me.full_name || me.username) : 'Someone';
          await createNotification(creation.user_id, 'like', creationId, null, myName + ' liked your creation');
        }
      } catch (e2) {}
    }
    // Refresh the notification badge if the recipient is viewing this page
    try { if (typeof loadNotifBadge === 'function') await loadNotifBadge(); } catch (e3) {}
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
  if (!session) { var isSubdir = window.location.pathname.includes('/pages/'); window.location.href = (isSubdir ? '' : 'pages/') + 'login.html'; return; }

  var prevSaved = btn.classList.contains('saved');
  btn.classList.toggle('saved');
  var iconEl = btn.querySelector('i');
  iconEl.className = btn.classList.contains('saved') ? 'fas fa-bookmark' : 'far fa-bookmark';
  var labelEl = btn.querySelector('span');
  if (labelEl) labelEl.textContent = btn.classList.contains('saved') ? 'Saved' : 'Save';

  // Keep every visible Save button for this creation in sync (feed card + detail popup)
  document.querySelectorAll('[data-save-for="' + creationId + '"]').forEach(function(other) {
    if (other === btn) return;
    syncSaveButton(other, btn.classList.contains('saved'));
  });

  try {
    await toggleSave(creationId);
  } catch(e) {
    btn.classList.toggle('saved');
    iconEl.className = prevSaved ? 'fas fa-bookmark' : 'far fa-bookmark';
    if (labelEl) labelEl.textContent = prevSaved ? 'Saved' : 'Save';
    document.querySelectorAll('[data-save-for="' + creationId + '"]').forEach(function(other) {
      if (other === btn) return;
      syncSaveButton(other, prevSaved);
    });
  }
}

/* ---- Sync a save/bookmark button's visual state ---- */
function syncSaveButton(btn, isSaved) {
  if (!btn) return;
  btn.classList.toggle('saved', isSaved);
  var iconEl = btn.querySelector('i');
  var labelEl = btn.querySelector('span');
  if (iconEl) iconEl.className = isSaved ? 'fas fa-bookmark' : 'far fa-bookmark';
  if (labelEl) labelEl.textContent = isSaved ? 'Saved' : 'Save';
}

/* ---- FOLLOW HANDLER ---- */
async function handleFollow(userId, btn) {
  if (!btn) return;
  var session = await getSession();
  if (!session) { var isSubdir = window.location.pathname.includes('/pages/'); window.location.href = (isSubdir ? '' : 'pages/') + 'login.html'; return; }

  var prevFollowing = btn.classList.contains('following');
  btn.disabled = true;

  try {
    var isNowFollowing = await toggleFollow(userId);
    if (isNowFollowing) {
      btn.className = 'follow-btn following';
      btn.innerHTML = '<i class="fas fa-check"></i> Following';
      // Send follow notification
      try {
        if (typeof createNotification === 'function') {
          var me = await getCurrentProfile();
          var name = me ? (me.full_name || me.username) : 'Someone';
          await createNotification(userId, 'follow', null, null, name + ' started following you');
        }
      } catch(e2) {}
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
    (isAuth ? '<div class="comment-input-row"><div class="comment-input-avatar" id="comment-avatar-' + creationId + '"></div><div class="comment-input-wrap"><input type="text" id="comment-input-' + creationId + '" placeholder="Share your thoughts..." maxlength="1000"><button class="comment-post-btn" onclick="postNewComment(\'' + creationId + '\')" aria-label="Post comment"><i class="fas fa-paper-plane"></i></button></div></div>' : '<div style="text-align:center;padding:8px 0;"><a href="' + (window.location.pathname.includes('/pages/') ? '' : 'pages/') + 'login.html" style="color:var(--accent);font-size:13px;">Log in to comment</a></div>') +
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
    var newComment = await postComment(creationId, content);
    input.value = '';
    var countEl = document.querySelector('#detail-overlay-' + creationId + ' .action-comment-count');
    if (countEl) countEl.textContent = parseInt(countEl.textContent || '0') + 1;
    // Send notification to creation owner
    try {
      var c = await fetchCreation(creationId);
      if (c && c.user_id && typeof createNotification === 'function') {
        var me = await getCurrentProfile();
        var name = me ? (me.full_name || me.username) : 'Someone';
        await createNotification(c.user_id, 'comment', creationId, newComment.id, name + ' commented on your creation "' + (c.title || '') + '"');
      }
    } catch(e2) {}
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
    var newComment = await postComment(creationId, content, parentId);
    try {
      var c = await fetchCreation(creationId);
      if (c && c.user_id && typeof createNotification === 'function') {
        var me = await getCurrentProfile();
        var name = me ? (me.full_name || me.username) : 'Someone';
        await createNotification(c.user_id, 'comment', creationId, newComment.id, name + ' replied to your comment on "' + (c.title || '') + '"');
      }
    } catch(e2) {}
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
