/* =========================================================
   AniMaker — Profile Management (Supabase)
   
   Reusable functions for profile CRUD, avatar upload,
   and profile data access. Works with the profiles table
   created by supabase-profiles-setup.sql.
   ========================================================= */

/* ---- Cached profile ---- */
var _currentProfile = null;

/* ---- Get current user's profile ---- */
async function getCurrentProfile() {
  if (_currentProfile) return _currentProfile;

  if (!supabaseClient) return null;

  try {
    const session = await getSession();
    if (!session || !session.user) return null;

    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error('[AniMaker] Profile query error:', error.message);
      if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
        console.error('[AniMaker] ⚠️ The profiles table does not exist. Run supabase-profiles-setup.sql in your Supabase SQL Editor.');
      }
      return null;
    }
    if (!data) return null;

    _currentProfile = data;
    return data;
  } catch {
    return null;
  }
}

/* ---- Load any user's profile by username or id ---- */
async function loadUserProfile(identifier) {
  if (!supabaseClient) return null;

  try {
    let query = supabaseClient.from('profiles').select('*');

    // If it looks like a UUID, search by id; otherwise by username
    if (identifier && identifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      query = query.eq('id', identifier);
    } else {
      query = query.eq('username', identifier);
    }

    const { data, error } = await query.single();
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

/* ---- Update current user's profile ---- */
async function updateUserProfile(updates) {
  if (!supabaseClient) throw new Error('Supabase not available');

  const session = await getSession();
  if (!session || !session.user) throw new Error('Not authenticated');

  // If updating username, check uniqueness
  if (updates.username) {
    const { data: existing } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('username', updates.username)
      .neq('id', session.user.id)
      .maybeSingle();

    if (existing) {
      throw new Error('Username is already taken');
    }
  }

  const { data, error } = await supabaseClient
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', session.user.id)
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to update profile');

  _currentProfile = data;
  return data;
}

/* ---- Upload avatar to Supabase Storage ---- */
async function uploadAvatar(file) {
  if (!supabaseClient) throw new Error('Supabase not available');

  const session = await getSession();
  if (!session || !session.user) throw new Error('Not authenticated');

  // Validate file
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Please upload a JPG, PNG, GIF, or WEBP image');
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('Image must be less than 5MB');
  }

  const ext = file.name.split('.').pop() || 'jpg';
  const filePath = session.user.id + '/avatar.' + ext;

  // Upload (upsert to replace existing)
  const { error } = await supabaseClient
    .storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) throw new Error(error.message || 'Failed to upload avatar');

  // Get public URL
  const { data: urlData } = supabaseClient
    .storage
    .from('avatars')
    .getPublicUrl(filePath);

  const avatarUrl = urlData.publicUrl + '?t=' + Date.now(); // Cache-bust

  // Update profile with new avatar URL
  await updateUserProfile({ avatar_url: avatarUrl });

  return avatarUrl;
}

/* ---- Format a profile for display ---- */
function formatProfile(profile) {
  if (!profile) return null;
  return {
    id: profile.id,
    username: profile.username || '',
    fullName: profile.full_name || '',
    email: profile.email || '',
    avatarUrl: profile.avatar_url || '',
    bio: profile.bio || '',
    role: profile.role || '',
    website: profile.website || '',
    location: profile.location || '',
    followersCount: profile.followers_count || 0,
    followingCount: profile.following_count || 0,
    postsCount: profile.posts_count || 0,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at
  };
}

/* ---- Get avatar HTML (with fallback) ---- */
function getAvatarHtml(profile, size) {
  size = size || 80;
  var displayName = (profile && (profile.full_name || profile.username)) || 'User';
  var initial = displayName.charAt(0).toUpperCase();

  if (profile && profile.avatar_url) {
    return '<img src="' + profile.avatar_url + '" alt="' + displayName + '" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;">';
  }
  return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:' + (size * 0.4) + 'px;font-weight:700;">' + initial + '</div>';
}

/* ---- Clear cached profile (call on logout) ---- */
function clearProfileCache() {
  _currentProfile = null;
}
