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
