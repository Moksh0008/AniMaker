/* =========================================================
   AniMaker v2.1 — Chat Realtime
   
   Supabase Realtime subscriptions for live messaging
   ========================================================= */

var _chatRealtimeChannel = null;
var _chatTypingChannel = null;
var _chatPresenceChannel = null;
var _chatOnlineUsers = {};

/* =========================================================
   SUBSCRIBE TO NEW MESSAGES
   ========================================================= */

function chatSubscribeMessages(conversationId) {
  chatUnsubscribeMessages();

  if (!supabaseClient || !conversationId) return;

  _chatRealtimeChannel = supabaseClient
    .channel('chat-messages-' + conversationId)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: 'conversation_id=eq.' + conversationId
      },
      async function(payload) {
        var msg = payload.new;

        // Ignore if we already have this message (optimistic insert)
        var exists = _chatMessages.find(function(m) { return m.id === msg.id; });
        if (exists) return;

        // Fetch sender profile
        var { data: senderProfile } = await supabaseClient
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .eq('id', msg.sender_id)
          .maybeSingle();

        msg._sender = senderProfile;
        msg._reactions = [];
        msg._replyTo = null;

        // Fetch reply-to if exists
        if (msg.reply_to_message_id) {
          var { data: replyMsg } = await supabaseClient
            .from('messages')
            .select('id, content, sender_id')
            .eq('id', msg.reply_to_message_id)
            .maybeSingle();
          msg._replyTo = replyMsg || null;
        }

        _chatMessages.push(msg);

        // Render the new message
        var container = document.getElementById('chatMessages');
        if (container) {
          renderChatMessages([msg], container, true);

          // Auto-scroll if near bottom
          var isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
          if (isNearBottom || msg.sender_id === _chatCurrentUserId) {
            chatScrollToBottom(true);
          }
        }

        // Mark as read if it's not our message
        if (msg.sender_id !== _chatCurrentUserId && _chatCurrentConv) {
          chatMarkAsRead(_chatCurrentConv.id);
          chatRefreshConversations();
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: 'conversation_id=eq.' + conversationId
      },
      function(payload) {
        var updated = payload.new;
        var idx = -1;
        for (var i = 0; i < _chatMessages.length; i++) {
          if (_chatMessages[i].id === updated.id) { idx = i; break; }
        }
        if (idx !== -1) {
          _chatMessages[idx] = Object.assign(_chatMessages[idx], updated);
          chatRefreshMessages();
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'messages',
        filter: 'conversation_id=eq.' + conversationId
      },
      function(payload) {
        var deletedId = payload.old.id;
        _chatMessages = _chatMessages.filter(function(m) { return m.id !== deletedId; });
        chatRefreshMessages();
      }
    )
    .subscribe();
}

/* =========================================================
   SUBSCRIBE TO REACTIONS
   ========================================================= */

function chatSubscribeReactions(conversationId) {
  if (!supabaseClient || !conversationId) return;

  // Reactions are on the same channel
  // We handle them via the messages subscription refresh
}

/* =========================================================
   UNSUBSCRIBE
   ========================================================= */

function chatUnsubscribeMessages() {
  if (_chatRealtimeChannel) {
    supabaseClient.removeChannel(_chatRealtimeChannel);
    _chatRealtimeChannel = null;
  }
}

function chatUnsubscribeAll() {
  chatUnsubscribeMessages();
  chatUnsubscribeTyping();
  chatUnsubscribePresence();
}

/* =========================================================
   TYPING INDICATOR (via broadcast)
   ========================================================= */

function chatSubscribeTyping(conversationId) {
  chatUnsubscribeTyping();

  if (!supabaseClient || !conversationId || !_chatCurrentUserId) return;

  _chatTypingChannel = supabaseClient.channel('chat-typing-' + conversationId);

  _chatTypingChannel
    .on('broadcast', { event: 'typing' }, function(payload) {
      if (payload.payload && payload.payload.user_id !== _chatCurrentUserId) {
        chatShowTypingIndicator(payload.payload.username || 'Someone');
      }
    })
    .subscribe();
}

function chatSendTypingBroadcast(conversationId, username) {
  if (_chatTypingChannel) {
    _chatTypingChannel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: _chatCurrentUserId,
        username: username || (_chatCurrentProfile ? _chatCurrentProfile.full_name || _chatCurrentProfile.username : 'User')
      }
    });
  }
}

function chatUnsubscribeTyping() {
  if (_chatTypingChannel) {
    supabaseClient.removeChannel(_chatTypingChannel);
    _chatTypingChannel = null;
  }
}

var _chatTypingIndicatorTimeout = null;

function chatShowTypingIndicator(username) {
  var el = document.getElementById('chatTypingIndicator');
  if (el) {
    el.innerHTML = '<div class="chat-typing-dots"><span></span><span></span><span></span></div> ' + chatEscapeHtml(username) + ' is typing...';
    el.style.display = 'flex';
  }

  clearTimeout(_chatTypingIndicatorTimeout);
  _chatTypingIndicatorTimeout = setTimeout(function() {
    if (el) el.style.display = 'none';
  }, 3000);
}

function chatHideTypingIndicator() {
  var el = document.getElementById('chatTypingIndicator');
  if (el) el.style.display = 'none';
}

/* =========================================================
   PRESENCE (online status)
   ========================================================= */

function chatSubscribePresence() {
  chatUnsubscribePresence();

  if (!supabaseClient || !_chatCurrentUserId) return;

  _chatPresenceChannel = supabaseClient.channel('chat-presence', {
    config: { presence: { key: _chatCurrentUserId } }
  });

  _chatPresenceChannel
    .on('presence', { event: 'sync' }, function() {
      _chatOnlineUsers = _chatPresenceChannel.presenceState();
      chatUpdateOnlineStatuses();
    })
    .on('presence', { event: 'join' }, function(payload) {
      payload.newPresences.forEach(function(p) {
        _chatOnlineUsers[p.user_id] = p;
      });
      chatUpdateOnlineStatuses();
    })
    .on('presence', { event: 'leave' }, function(payload) {
      payload.leftPresences.forEach(function(p) {
        delete _chatOnlineUsers[p.user_id];
      });
      chatUpdateOnlineStatuses();
    })
    .subscribe(async function(status) {
      if (status === 'SUBSCRIBED') {
        await _chatPresenceChannel.track({
          user_id: _chatCurrentUserId,
          username: _chatCurrentProfile ? _chatCurrentProfile.full_name || _chatCurrentProfile.username : 'User',
          online_at: new Date().toISOString()
        });
      }
    });
}

function chatUnsubscribePresence() {
  if (_chatPresenceChannel) {
    supabaseClient.removeChannel(_chatPresenceChannel);
    _chatPresenceChannel = null;
  }
}

function chatUpdateOnlineStatuses() {
  // Update header status
  if (_chatCurrentConv) {
    var otherUserId = _chatCurrentConv.otherUser.id;
    var isOnline = !!_chatOnlineUsers[otherUserId];
    var statusEl = document.getElementById('chatHeaderStatus');
    if (statusEl) {
      statusEl.textContent = isOnline ? 'Online' : 'Active now';
      statusEl.className = 'chat-header-status' + (isOnline ? ' online' : '');
    }

    // Update avatar dot
    var dotEl = document.getElementById('chatHeaderOnlineDot');
    if (dotEl) {
      dotEl.style.display = isOnline ? 'block' : 'none';
    }
  }

  // Update conversation list online dots
  for (var userId in _chatOnlineUsers) {
    var dot = document.querySelector('[data-online-user="' + userId + '"] .online-dot');
    if (dot) dot.style.display = 'block';
  }
}

function isUserOnline(userId) {
  return !!_chatOnlineUsers[userId];
}
