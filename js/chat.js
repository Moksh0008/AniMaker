/* =========================================================
   AniMaker v2.1 — Chat Core Logic
   
   Handles: Conversations, Messages, Reactions, Read status
   ========================================================= */

/* ---- State ---- */
var _chatConversations = [];
var _chatCurrentConv = null;
var _chatMessages = [];
var _chatOffset = 0;
var _chatHasMore = true;
var _chatLoading = false;
var _chatCurrentUserId = null;
var _chatCurrentProfile = null;
var _chatReplyTo = null;
var _chatUploadFile = null;
var _chatTypingTimeout = null;
var _chatPresenceChannel = null;

/* ---- Constants ---- */
var CHAT_PAGE_SIZE = 30;
var CHAT_VALID_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
var CHAT_VALID_VIDEO = ['video/mp4', 'video/webm'];
var CHAT_MAX_IMAGE = 10 * 1024 * 1024;
var CHAT_MAX_VIDEO = 50 * 1024 * 1024;
var CHAT_REACTIONS = ['❤️', '😂', '🔥', '😍', '😢', '😮', '👍'];

/* =========================================================
   CONVERSATION OPERATIONS
   ========================================================= */

/* ---- Get or create a conversation between two users ---- */
async function chatGetOrCreateConversation(userId) {
  if (!supabaseClient || !_chatCurrentUserId) return null;

  // Check if conversation already exists between these two users
  var { data: myParts } = await supabaseClient
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', _chatCurrentUserId);

  if (myParts && myParts.length > 0) {
    var myConvIds = myParts.map(function(p) { return p.conversation_id; });

    var { data: otherParts } = await supabaseClient
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)
      .in('conversation_id', myConvIds);

    if (otherParts && otherParts.length > 0) {
      return otherParts[0].conversation_id;
    }
  }

  // Create new conversation
  var { data: conv, error: convErr } = await supabaseClient
    .from('conversations')
    .insert({})
    .select()
    .single();

  if (convErr) {
    console.error('[Chat] Create conversation error:', convErr.message);
    return null;
  }

  // Add both participants
  var { error: partErr } = await supabaseClient
    .from('conversation_participants')
    .insert([
      { conversation_id: conv.id, user_id: _chatCurrentUserId },
      { conversation_id: conv.id, user_id: userId }
    ]);

  if (partErr) {
    console.error('[Chat] Add participants error:', partErr.message);
    return null;
  }

  return conv.id;
}

/* ---- Fetch user's conversations ---- */
async function chatFetchConversations() {
  if (!supabaseClient || !_chatCurrentUserId) return [];

  // Get all conversations for current user
  var { data: myParts } = await supabaseClient
    .from('conversation_participants')
    .select('conversation_id, last_read_at, archived, muted')
    .eq('user_id', _chatCurrentUserId);

  if (!myParts || myParts.length === 0) return [];

  var convIds = myParts.map(function(p) { return p.conversation_id; });

  // Get conversation details
  var { data: convs } = await supabaseClient
    .from('conversations')
    .select('*')
    .in('id', convIds)
    .order('last_message_at', { ascending: false });

  if (!convs || convs.length === 0) return [];

  // For each conversation, get the other participant and last message
  var results = [];
  for (var i = 0; i < convs.length; i++) {
    var conv = convs[i];
    var myPart = myParts.find(function(p) { return p.conversation_id === conv.id; });

    // Get other participant
    var { data: otherParts } = await supabaseClient
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conv.id)
      .neq('user_id', _chatCurrentUserId)
      .limit(1);

    if (!otherParts || otherParts.length === 0) continue;

    // Get other user's profile
    var { data: otherProfile } = await supabaseClient
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .eq('id', otherParts[0].user_id)
      .maybeSingle();

    // Get last message
    var { data: lastMsg } = await supabaseClient
      .from('messages')
      .select('id, content, message_type, sender_id, created_at')
      .eq('conversation_id', conv.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1);

    // Count unread messages
    var { count: unreadCount } = await supabaseClient
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)
      .neq('sender_id', _chatCurrentUserId)
      .is('deleted_at', null)
      .gt('created_at', myPart ? myPart.last_read_at : '2000-01-01');

    var lastMsgData = lastMsg && lastMsg.length > 0 ? lastMsg[0] : null;
    var otherUserName = otherProfile
      ? (otherProfile.full_name || otherProfile.username || 'User')
      : 'User';

    var preview = '';
    if (lastMsgData) {
      if (lastMsgData.message_type === 'image') preview = '📷 Photo';
      else if (lastMsgData.message_type === 'video') preview = '🎬 Video';
      else if (lastMsgData.message_type === 'file') preview = '📎 Attachment';
      else if (lastMsgData.sender_id === _chatCurrentUserId) preview = 'You: ' + (lastMsgData.content || '');
      else preview = lastMsgData.content || '';
      if (preview.length > 40) preview = preview.substring(0, 40) + '...';
    }

    results.push({
      id: conv.id,
      otherUser: otherProfile || { id: otherParts[0].user_id, username: otherUserName },
      otherUserName: otherUserName,
      otherUserAvatar: otherProfile ? otherProfile.avatar_url : '',
      lastMessage: lastMsgData ? lastMsgData.content : '',
      lastMessageType: lastMsgData ? lastMsgData.message_type : '',
      lastMessageAt: lastMsgData ? lastMsgData.created_at : conv.last_message_at,
      lastMessageSender: lastMsgData ? lastMsgData.sender_id : '',
      unreadCount: unreadCount || 0,
      archived: myPart ? myPart.archived : false,
      muted: myPart ? myPart.muted : false,
      preview: preview
    });
  }

  // Sort by last message time
  results.sort(function(a, b) {
    return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
  });

  _chatConversations = results;
  return results;
}

/* ---- Fetch messages for a conversation ---- */
async function chatFetchMessages(conversationId, offset, limit) {
  if (!supabaseClient) return [];

  offset = offset || 0;
  limit = limit || CHAT_PAGE_SIZE;

  var { data: msgs, error } = await supabaseClient
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[Chat] Fetch messages error:', error.message);
    return [];
  }

  // Fetch sender profiles
  var senderIds = [];
  for (var i = 0; i < (msgs || []).length; i++) {
    if (msgs[i].sender_id && senderIds.indexOf(msgs[i].sender_id) === -1) {
      senderIds.push(msgs[i].sender_id);
    }
  }

  var profiles = {};
  if (senderIds.length > 0) {
    var { data: profs } = await supabaseClient
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', senderIds);
    if (profs) {
      for (var j = 0; j < profs.length; j++) {
        profiles[profs[j].id] = profs[j];
      }
    }
  }

  // Attach profiles and fetch reactions
  var enriched = [];
  for (var k = 0; k < (msgs || []).length; k++) {
    var m = msgs[k];
    m._sender = profiles[m.sender_id] || null;

    // Fetch reactions
    var { data: reacts } = await supabaseClient
      .from('message_reactions')
      .select('reaction, user_id')
      .eq('message_id', m.id);

    m._reactions = reacts || [];

    // Fetch reply-to message if exists
    if (m.reply_to_message_id) {
      var { data: replyMsg } = await supabaseClient
        .from('messages')
        .select('id, content, sender_id')
        .eq('id', m.reply_to_message_id)
        .maybeSingle();
      m._replyTo = replyMsg || null;
    }

    enriched.push(m);
  }

  // Reverse to chronological order
  enriched.reverse();
  return enriched;
}

/* ---- Send a text message ---- */
async function chatSendMessage(conversationId, content, replyToId) {
  if (!supabaseClient || !conversationId) throw new Error('No conversation');
  if (!_chatCurrentUserId) throw new Error('Not authenticated');

  var record = {
    conversation_id: conversationId,
    sender_id: _chatCurrentUserId,
    message_type: 'text',
    content: content,
    reply_to_message_id: replyToId || null
  };

  var { data, error } = await supabaseClient
    .from('messages')
    .insert(record)
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to send message');

  // Notify other conversation participants about the new message
  try { await chatNotifyParticipants(conversationId, 'sent you a message'); } catch (e) {}

  return data;
}

/* ---- Send a media message ---- */
async function chatSendMediaMessage(conversationId, file, replyToId) {
  if (!supabaseClient || !conversationId) throw new Error('No conversation');
  if (!_chatCurrentUserId) throw new Error('Not authenticated');

  var isImage = CHAT_VALID_IMAGE.indexOf(file.type) !== -1;
  var isVideo = CHAT_VALID_VIDEO.indexOf(file.type) !== -1;
  if (!isImage && !isVideo) throw new Error('Unsupported file type');

  // Upload to chat-attachments bucket
  var ext = file.name.split('.').pop() || (isImage ? 'jpg' : 'mp4');
  var timestamp = Date.now();
  var random = Math.random().toString(36).substring(2, 8);
  var filePath = _chatCurrentUserId + '/' + timestamp + '-' + random + '.' + ext;

  var session = await getSession();
  if (!session) throw new Error('Not authenticated');

  var uploadUrl = supabaseClient.supabaseUrl + '/storage/v1/object/chat-attachments/' + filePath;
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

  var publicUrl = supabaseClient.supabaseUrl + '/storage/v1/object/public/chat-attachments/' + filePath;

  var record = {
    conversation_id: conversationId,
    sender_id: _chatCurrentUserId,
    message_type: isImage ? 'image' : 'video',
    attachment_url: publicUrl,
    attachment_name: file.name,
    attachment_size: file.size,
    reply_to_message_id: replyToId || null
  };

  var { data, error } = await supabaseClient
    .from('messages')
    .insert(record)
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to send media');

  // Notify other participants for media messages too
  try { await chatNotifyParticipants(conversationId, 'sent you an attachment'); } catch (e) {}

  return data;
}

/* ---- Notify other conversation participants about a new message ---- */
async function chatNotifyParticipants(conversationId, actionText) {
  if (!supabaseClient || !_chatCurrentUserId) return;
  var { data: parts } = await supabaseClient
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId);
  if (!parts || !parts.length) return;

  var me = await getCurrentProfile();
  var myName = me ? (me.full_name || me.username) : 'Someone';
  for (var i = 0; i < parts.length; i++) {
    var uid = parts[i].user_id;
    if (uid === _chatCurrentUserId) continue;
    await createNotification(uid, 'message', null, null, myName + ' ' + actionText);
  }
}

/* ---- Edit a message ---- */
async function chatEditMessage(messageId, newContent) {
  if (!supabaseClient) throw new Error('Supabase not available');

  var { data, error } = await supabaseClient
    .from('messages')
    .update({
      content: newContent,
      edited_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', messageId)
    .eq('sender_id', _chatCurrentUserId)
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to edit');
  return data;
}

/* ---- Delete/unsend a message ---- */
async function chatDeleteMessage(messageId) {
  if (!supabaseClient) throw new Error('Supabase not available');

  var { error } = await supabaseClient
    .from('messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('sender_id', _chatCurrentUserId);

  if (error) throw new Error(error.message || 'Failed to delete');
  return true;
}

/* ---- Toggle reaction on a message ---- */
async function chatToggleReaction(messageId, reaction) {
  if (!supabaseClient) throw new Error('Supabase not available');
  if (!_chatCurrentUserId) throw new Error('Not authenticated');

  // Check if already reacted with this emoji
  var { data: existing } = await supabaseClient
    .from('message_reactions')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_id', _chatCurrentUserId)
    .eq('reaction', reaction)
    .maybeSingle();

  if (existing) {
    var { error } = await supabaseClient
      .from('message_reactions')
      .delete()
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
    return false;
  } else {
    var { error } = await supabaseClient
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: _chatCurrentUserId,
        reaction: reaction
      });
    if (error) throw new Error(error.message);
    return true;
  }
}

/* ---- Mark messages as read ---- */
async function chatMarkAsRead(conversationId) {
  if (!supabaseClient || !_chatCurrentUserId) return;

  await supabaseClient
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', _chatCurrentUserId);
}

/* ---- Mark messages as seen (delivered) ---- */
async function chatMarkSeen(messageIds) {
  if (!supabaseClient || !messageIds || messageIds.length === 0) return;

  // Update seen status via a simple approach
  // In production you might have a separate seen_at column
  // For now, last_read_at handles this
}

/* ---- Send typing indicator via realtime broadcast ---- */
function chatSendTyping(conversationId) {
  if (_chatTypingTimeout) clearTimeout(_chatTypingTimeout);
  _chatTypingTimeout = setTimeout(function() {
    _chatTypingTimeout = null;
  }, 3000);
}

/* ---- Chat Preferences (per-conversation themes) ---- */
async function chatGetPreference(conversationId) {
  if (!supabaseClient || !_chatCurrentUserId) return null;

  var { data } = await supabaseClient
    .from('chat_preferences')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('user_id', _chatCurrentUserId)
    .maybeSingle();

  return data;
}

async function chatSavePreference(conversationId, prefs) {
  if (!supabaseClient || !_chatCurrentUserId) return;

  var existing = await chatGetPreference(conversationId);

  if (existing) {
    var { error } = await supabaseClient
      .from('chat_preferences')
      .update({ ...prefs, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
  } else {
    var { error } = await supabaseClient
      .from('chat_preferences')
      .insert({
        conversation_id: conversationId,
        user_id: _chatCurrentUserId,
        ...prefs
      });
    if (error) throw new Error(error.message);
  }
}

/* ---- Update last_read_at ---- */
async function chatUpdateLastRead(conversationId) {
  if (!supabaseClient || !_chatCurrentUserId) return;

  await supabaseClient
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', _chatCurrentUserId);
}

/* ---- Search users for new chat ---- */
async function chatSearchUsers(query) {
  if (!supabaseClient || !query || !query.trim()) return [];

  var q = query.trim();

  var { data } = await supabaseClient
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .or('username.ilike.%' + q + '%,full_name.ilike.%' + q + '%')
    .neq('id', _chatCurrentUserId)
    .limit(20);

  return data || [];
}

/* ---- Search within a conversation ---- */
async function chatSearchMessages(conversationId, query) {
  if (!supabaseClient || !query || !query.trim()) return [];

  var { data: msgs } = await supabaseClient
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .ilike('content', '%' + query.trim() + '%')
    .order('created_at', { ascending: false })
    .limit(50);

  return msgs || [];
}

/* ---- Archive/Unarchive conversation ---- */
async function chatToggleArchive(conversationId, archive) {
  if (!supabaseClient || !_chatCurrentUserId) return;

  await supabaseClient
    .from('conversation_participants')
    .update({ archived: archive })
    .eq('conversation_id', conversationId)
    .eq('user_id', _chatCurrentUserId);
}

/* ---- Mute/Unmute conversation ---- */
async function chatToggleMute(conversationId, mute) {
  if (!supabaseClient || !_chatCurrentUserId) return;

  await supabaseClient
    .from('conversation_participants')
    .update({ muted: mute })
    .eq('conversation_id', conversationId)
    .eq('user_id', _chatCurrentUserId);
}

/* ---- Helper: format chat time ---- */
function chatFormatTime(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr);
  var now = new Date();
  var hours = d.getHours();
  var mins = d.getMinutes();
  var ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return hours + ':' + (mins < 10 ? '0' : '') + mins + ' ' + ampm;
}

function chatFormatDate(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr);
  var now = new Date();
  var diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function chatFormatConvTime(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr);
  var now = new Date();
  var diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diff === 0) {
    var hours = d.getHours();
    var mins = d.getMinutes();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return hours + ':' + (mins < 10 ? '0' : '') + mins + ' ' + ampm;
  }
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ---- Helper: avatar HTML ---- */
function chatAvatarHtml(profile, size) {
  size = size || 50;
  if (!profile) {
    return '<div class="avatar-fallback" style="width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.4) + 'px;">?</div>';
  }
  if (profile.avatar_url) {
    return '<img src="' + profile.avatar_url + '" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;"><div class="avatar-fallback" style="display:none;width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.4) + 'px;">' + (profile.full_name || profile.username || 'U').charAt(0).toUpperCase() + '</div>';
  }
  var initial = (profile.full_name || profile.username || 'U').charAt(0).toUpperCase();
  return '<div class="avatar-fallback" style="width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.4) + 'px;">' + initial + '</div>';
}

/* ---- Helper: escape HTML ---- */
function chatEscapeHtml(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ---- Initialize chat state ---- */
async function chatInit() {
  var session = await getSession();
  if (!session || !session.user) {
    var isSubdir = window.location.pathname.indexOf('/pages/') !== -1;
    window.location.href = (isSubdir ? '' : 'pages/') + 'login.html';
    return false;
  }

  _chatCurrentUserId = session.user.id;
  _chatCurrentProfile = await getCurrentProfile();
  return true;
}
