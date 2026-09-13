/* =========================================================
   AniMaker v2.1 — Chat UI Rendering
   
   Renders conversation list, messages, composer, details panel
   ========================================================= */

/* =========================================================
   MESSAGE STATUS (Sent / Delivered / Seen)
   ========================================================= */

/* The other participant's last_read_at for the open conversation.
   Refreshed when conversations refresh and when participants change. */
var _chatOtherLastRead = null;

function chatUpdateOtherLastRead(convs) {
  _chatOtherLastRead = null;
  if (!_chatCurrentConv || !convs) return;
  var conv = null;
  for (var i = 0; i < convs.length; i++) {
    if (convs[i].id === _chatCurrentConv.id) { conv = convs[i]; break; }
  }
  if (conv) _chatOtherLastRead = conv.otherUserLastReadAt || null;
}

/* Status of one of my messages:
   - Sent      = written to the database (always true once it renders)
   - Delivered = the other user's client received the message
                 (they have an active presence session) OR they have
                 read up to this message
   - Seen      = the other user's last_read_at is at/after this message */
function chatMessageStatus(msg) {
  if (_chatOtherLastRead && new Date(msg.created_at) <= new Date(_chatOtherLastRead)) {
    return 'Seen';
  }
  // Delivered heuristic: recipient online right now means their client
  // is connected and has pulled this conversation's realtime stream
  if (_chatCurrentConv && _chatCurrentConv.otherUser &&
      typeof isUserOnline === 'function' && isUserOnline(_chatCurrentConv.otherUser.id)) {
    return 'Delivered';
  }
  return 'Sent';
}

/* =========================================================
   CONVERSATION LIST RENDERING
   ========================================================= */

function renderChatConversationList(conversations, container) {
  if (!container) return;

  // Split list by active tab: "Requests" shows chats from people
  // outside your network (no mutual follows), Instagram-style
  var isRequestsTab = _chatActiveTab === 'requests';
  var visible = (conversations || []).filter(function(c) {
    return isRequestsTab ? !!c.isRequest : !c.isRequest;
  });

  if (!conversations || conversations.length === 0) {
    container.innerHTML =
      '<div class="chat-empty-state" style="padding:40px 20px;">' +
        '<i class="far fa-paper-plane" style="font-size:48px;"></i>' +
        '<h3 style="font-size:18px;">' + (isRequestsTab ? 'No message requests' : 'No messages yet') + '</h3>' +
        '<p style="font-size:13px;">' + (isRequestsTab
          ? 'Chats from people you don\'t follow will appear here.'
          : 'Start a conversation with someone from AniMaker.') + '</p>' +
      '</div>';
    return;
  }

  if (visible.length === 0) {
    container.innerHTML =
      '<div class="chat-empty-state" style="padding:40px 20px;">' +
        '<i class="far fa-paper-plane" style="font-size:48px;"></i>' +
        '<h3 style="font-size:18px;">' + (isRequestsTab ? 'No message requests' : 'No messages yet') + '</h3>' +
        '<p style="font-size:13px;">' + (isRequestsTab
          ? 'Chats from people you don\'t follow will appear here.'
          : 'Start a conversation with someone from AniMaker.') + '</p>' +
      '</div>';
    return;
  }

  var html = '';
  for (var i = 0; i < visible.length; i++) {
    var conv = visible[i];
    var isActive = _chatCurrentConv && _chatCurrentConv.id === conv.id;
    var isUnread = conv.unreadCount > 0;
    var isSentByMe = conv.lastMessageSender === _chatCurrentUserId;

    var classes = 'chat-conv-item';
    if (isActive) classes += ' active';
    if (isUnread) classes += ' unread';

    html += '<div class="' + classes + '" data-conv-id="' + conv.id + '" onclick="chatOpenConversation(\'' + conv.id + '\')">' +
      '<div class="chat-conv-avatar">' +
        chatAvatarHtml(conv.otherUser, 50) +
      '</div>' +
      '<div class="chat-conv-info">' +
        '<div class="chat-conv-name">' + chatEscapeHtml(conv.otherUserName) + '</div>' +
        '<div class="chat-conv-preview">' + chatEscapeHtml(conv.preview) + '</div>' +
      '</div>' +
      '<div class="chat-conv-meta">' +
        '<div class="chat-conv-time">' + chatFormatConvTime(conv.lastMessageAt) + '</div>' +
        (isUnread ? '<div class="chat-conv-unread">' + (conv.unreadCount > 99 ? '99+' : conv.unreadCount) + '</div>' : '') +
      '</div>' +
    '</div>';
  }

  container.innerHTML = html;
}

/* =========================================================
   MESSAGE BUBBLE RENDERING
   ========================================================= */

function renderChatMessages(messages, container, isAppend) {
  if (!container) return;

  if (!isAppend) container.innerHTML = '';

  if (!messages || messages.length === 0) {
    if (!isAppend) {
      container.innerHTML =
        '<div class="chat-empty-state" style="padding:40px;">' +
          '<i class="far fa-comment-dots" style="font-size:48px;"></i>' +
          '<h3 style="font-size:18px;">Start the conversation</h3>' +
          '<p style="font-size:13px;">Send a message to begin chatting.</p>' +
        '</div>';
    }
    return;
  }

  var prevDate = '';
  var prevSender = '';

  for (var i = 0; i < messages.length; i++) {
    var msg = messages[i];

    // Skip deleted messages
    if (msg.deleted_at) {
      var deletedGroup = document.createElement('div');
      deletedGroup.className = 'chat-msg-group ' + (msg.sender_id === _chatCurrentUserId ? 'sent' : 'received');
      deletedGroup.innerHTML =
        '<div class="chat-msg-content">' +
          '<div class="chat-msg-bubble rounded chat-msg-deleted">' +
            '<i class="fas fa-ban" style="margin-right:6px;font-size:12px;"></i>This message was deleted' +
          '</div>' +
        '</div>';
      container.appendChild(deletedGroup);
      continue;
    }

    var isMine = msg.sender_id === _chatCurrentUserId;
    var msgDate = chatFormatDate(msg.created_at);
    var senderName = msg._sender
      ? (msg._sender.full_name || msg._sender.username || 'User')
      : 'User';

    // Date separator
    if (msgDate !== prevDate) {
      var sep = document.createElement('div');
      sep.className = 'chat-date-sep';
      sep.innerHTML = '<span>' + msgDate + '</span>';
      container.appendChild(sep);
      prevDate = msgDate;
    }

    // Message group
    var group = document.createElement('div');
    group.className = 'chat-msg-group ' + (isMine ? 'sent' : 'received');
    group.dataset.msgId = msg.id;

    var avatarHtml = '';
    if (!isMine) {
      avatarHtml = '<div class="chat-msg-avatar">' +
        chatAvatarHtml(msg._sender, 30) +
      '</div>';
    }

    // Get theme bubble style
    var bubbleStyle = 'rounded'; // default
    if (window._chatCurrentTheme && window._chatCurrentTheme.bubble_style) {
      bubbleStyle = window._chatCurrentTheme.bubble_style;
    }

    var bubbleContent = '';

    // Reply preview
    if (msg.reply_to_message_id && msg._replyTo) {
      var replySender = 'Unknown';
      if (msg._replyTo.sender_id === _chatCurrentUserId) replySender = 'You';
      else if (msg._replyTo.sender_id && _chatConversations.length > 0) {
        var conv = _chatConversations.find(function(c) { return c.id === msg.conversation_id; });
        if (conv) replySender = conv.otherUserName;
      }
      bubbleContent += '<div class="chat-msg-reply" onclick="chatScrollToMessage(\'' + msg.reply_to_message_id + '\')">' +
        '<div class="chat-msg-reply-sender">' + chatEscapeHtml(replySender) + '</div>' +
        '<div class="chat-msg-reply-text">' + chatEscapeHtml(msg._replyTo.content || 'Message') + '</div>' +
      '</div>';
    }

    // Content based on type
    if (msg.message_type === 'image' && msg.attachment_url) {
      bubbleContent += '<div class="chat-msg-image"><img src="' + msg.attachment_url + '" onclick="chatOpenLightbox(\'' + msg.attachment_url + '\')" loading="lazy"></div>';
    } else if (msg.message_type === 'video' && msg.attachment_url) {
      bubbleContent += '<div class="chat-msg-video"><video src="' + msg.attachment_url + '" controls playsinline preload="metadata"></video></div>';
    }

    // Shared-creation card (sent via the Share feature)
    if (typeof SHARE_MSG_SENTINEL !== 'undefined' && msg.content && msg.content.indexOf(SHARE_MSG_SENTINEL) === 0) {
      bubbleContent += renderSharedCreationCard(msg.content);
    } else if (msg.content) {
      bubbleContent += '<div class="chat-msg-content-text">' + chatEscapeHtml(msg.content).replace(/\n/g, '<br>') + '</div>';
    }

    // Edited indicator
    if (msg.edited_at) {
      bubbleContent += '<div class="chat-msg-edited">edited</div>';
    }

    // Reactions
    var reactionHtml = renderMessageReactions(msg);

    // Action menu
    var actionHtml = renderMessageActions(msg, isMine);

    // Status and time — WhatsApp-style: Sent / Delivered / Seen
    var statusHtml = '';
    if (isMine) {
      var state = chatMessageStatus(msg);
      var cls = state === 'Seen' ? 'seen' : '';
      statusHtml = '<span class="chat-msg-status ' + cls + '">' + state + '</span>';
    }

    var contentHtml =
      '<div class="chat-msg-content">' +
        '<div class="chat-msg-bubble ' + bubbleStyle + '">' +
          bubbleContent +
        '</div>' +
        reactionHtml +
        '<div class="chat-msg-meta">' +
          '<span class="chat-msg-time">' + chatFormatTime(msg.created_at) + '</span>' +
          statusHtml +
        '</div>' +
      '</div>';

    group.innerHTML = avatarHtml + contentHtml + actionHtml;
    container.appendChild(group);

    prevSender = msg.sender_id;
  }
}

/* ---- Render reactions for a message ---- */
function renderSharedCreationCard(content) {
  try {
    var data = JSON.parse(content.replace(SHARE_MSG_SENTINEL, ''));
    var icon = data.type === 'writer' ? 'fa-pen-nib' : data.type === 'maker' ? 'fa-video' : 'fa-image';
    var imgHtml = data.img
      ? '<img class="chat-shared-card-img" src="' + data.img + '" alt="" loading="lazy" onerror="this.outerHTML=\'<div class=chat-shared-card-img-wrap><i class=&quot;fas ' + icon + '&quot;></i></div>\'">'
      : '<div class="chat-shared-card-img-wrap"><i class="fas ' + icon + '"></i></div>';
    return '<a class="chat-shared-card" href="#" onclick="viewSharedCreation(\'' + data.id + '\', \'' + data.type + '\');return false;" aria-label="View shared creation">' +
      imgHtml +
      '<div class="chat-shared-card-body">' +
        '<div class="chat-shared-card-type">' + (data.type === 'writer' ? 'Story' : data.type === 'maker' ? 'Video' : 'Artwork') + '</div>' +
        '<div class="chat-shared-card-title">' + chatEscapeHtml(data.t || 'Untitled') + '</div>' +
        '<div class="chat-shared-card-byline">@' + chatEscapeHtml(data.u || 'AniMaker') + '</div>' +
        '<div class="chat-shared-card-cta"><i class="fas fa-arrow-up-right-from-square"></i> View Creation</div>' +
      '</div>' +
    '</a>';
  } catch (e) {
    return '';
  }
}

function renderMessageReactions(msg) {
  if (!msg._reactions || msg._reactions.length === 0) return '';

  // Group reactions by emoji
  var grouped = {};
  for (var i = 0; i < msg._reactions.length; i++) {
    var r = msg._reactions[i];
    if (!grouped[r.reaction]) grouped[r.reaction] = { count: 0, mine: false };
    grouped[r.reaction].count++;
    if (r.user_id === _chatCurrentUserId) grouped[r.reaction].mine = true;
  }

  var html = '<div class="chat-msg-reactions">';
  var keys = Object.keys(grouped);
  for (var j = 0; j < keys.length; j++) {
    var emoji = keys[j];
    var g = grouped[emoji];
    html += '<span class="chat-msg-reaction' + (g.mine ? ' mine' : '') + '" onclick="chatHandleReaction(\'' + msg.id + '\', \'' + emoji + '\')" title="React">' +
      emoji + (g.count > 1 ? ' <span class="chat-msg-reaction-count">' + g.count + '</span>' : '') +
    '</span>';
  }
  html += '</div>';
  return html;
}

/* ---- Render message action menu ---- */
function renderMessageActions(msg, isMine) {
  var html = '<div class="chat-msg-actions">';
  html += '<button class="chat-msg-action-btn" onclick="chatShowReactionPicker(event, \'' + msg.id + '\')" title="React"><i class="far fa-face-smile"></i></button>';
  html += '<button class="chat-msg-action-btn" onclick="chatSetReplyTo(\'' + msg.id + '\')" title="Reply"><i class="fas fa-reply"></i></button>';
  if (isMine && msg.message_type === 'text') {
    html += '<button class="chat-msg-action-btn" onclick="chatStartEdit(\'' + msg.id + '\')" title="Edit"><i class="far fa-pen-to-square"></i></button>';
    html += '<button class="chat-msg-action-btn" onclick="chatConfirmDelete(\'' + msg.id + '\')" title="Delete"><i class="far fa-trash-can"></i></button>';
  }
  html += '</div>';
  return html;
}

/* =========================================================
   REACTION PICKER
   ========================================================= */

var _chatActiveReactionMsgId = null;

function chatShowReactionPicker(e, messageId) {
  e.stopPropagation();
  _chatActiveReactionMsgId = messageId;

  var picker = document.getElementById('chatReactionPicker');
  if (!picker) {
    picker = document.createElement('div');
    picker.id = 'chatReactionPicker';
    picker.className = 'chat-emoji-picker';
    document.body.appendChild(picker);
  }

  var html = '';
  for (var i = 0; i < CHAT_REACTIONS.length; i++) {
    html += '<button class="chat-emoji-option" onclick="chatPickReaction(\'' + CHAT_REACTIONS[i] + '\')">' + CHAT_REACTIONS[i] + '</button>';
  }
  picker.innerHTML = html;

  // Position near the click
  var rect = e.target.getBoundingClientRect();
  picker.style.position = 'fixed';
  picker.style.left = rect.left + 'px';
  picker.style.top = (rect.top - 50) + 'px';
  picker.style.zIndex = '8000';
  picker.classList.add('show');

  // Close on outside click
  setTimeout(function() {
    document.addEventListener('click', chatCloseReactionPicker, { once: true });
  }, 10);
}

function chatCloseReactionPicker() {
  var picker = document.getElementById('chatReactionPicker');
  if (picker) picker.classList.remove('show');
}

async function chatPickReaction(reaction) {
  if (!_chatActiveReactionMsgId) return;
  chatCloseReactionPicker();

  try {
    await chatToggleReaction(_chatActiveReactionMsgId, reaction);
    // Re-render messages
    if (_chatCurrentConv) {
      chatRefreshMessages();
    }
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function chatHandleReaction(messageId, reaction) {
  try {
    await chatToggleReaction(messageId, reaction);
    chatRefreshMessages();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

/* =========================================================
   REPLY SYSTEM
   ========================================================= */

function chatSetReplyTo(messageId) {
  var msg = _chatMessages.find(function(m) { return m.id === messageId; });
  if (!msg) return;

  _chatReplyTo = msg;

  var replyPreview = document.getElementById('chatReplyPreview');
  var replySender = msg.sender_id === _chatCurrentUserId ? 'You' : (_chatCurrentProfile ? _chatCurrentProfile.full_name || 'User' : 'User');
  if (msg.sender_id !== _chatCurrentUserId && _chatCurrentConv) {
    replySender = _chatCurrentConv.otherUserName;
  }

  replyPreview.className = 'chat-composer-reply-preview show';
  replyPreview.innerHTML =
    '<div class="chat-composer-reply-info">' +
      '<div class="chat-composer-reply-sender">Replying to ' + chatEscapeHtml(replySender) + '</div>' +
      '<div class="chat-composer-reply-text">' + chatEscapeHtml(msg.content || 'Media') + '</div>' +
    '</div>' +
    '<button class="chat-composer-reply-close" onclick="chatCancelReply()"><i class="fas fa-xmark"></i></button>';

  document.getElementById('chatInput').focus();
}

function chatCancelReply() {
  _chatReplyTo = null;
  var replyPreview = document.getElementById('chatReplyPreview');
  if (replyPreview) replyPreview.className = 'chat-composer-reply-preview';
}

/* =========================================================
   EDIT / DELETE
   ========================================================= */

function chatStartEdit(messageId) {
  var msg = _chatMessages.find(function(m) { return m.id === messageId; });
  if (!msg || msg.sender_id !== _chatCurrentUserId) return;

  var input = document.getElementById('chatInput');
  input.value = msg.content || '';
  input.dataset.editingId = messageId;
  input.focus();

  // Show edit mode
  var composerReply = document.getElementById('chatReplyPreview');
  composerReply.className = 'chat-composer-reply-preview show';
  composerReply.innerHTML =
    '<div class="chat-composer-reply-info">' +
      '<div class="chat-composer-reply-sender">Editing message</div>' +
      '<div class="chat-composer-reply-text">' + chatEscapeHtml(msg.content || '') + '</div>' +
    '</div>' +
    '<button class="chat-composer-reply-close" onclick="chatCancelEdit()"><i class="fas fa-xmark"></i></button>';
}

function chatCancelEdit() {
  var input = document.getElementById('chatInput');
  if (input) {
    input.value = '';
    delete input.dataset.editingId;
  }
  chatCancelReply();
}

async function chatConfirmDelete(messageId) {
  if (!confirm('Delete this message? This cannot be undone.')) return;

  try {
    await chatDeleteMessage(messageId);
    chatRefreshMessages();
    showToast('Message deleted', 'success');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

/* =========================================================
   SCROLL & NAVIGATION
   ========================================================= */

function chatScrollToBottom(smooth) {
  var container = document.getElementById('chatMessages');
  if (container) {
    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }
}

function chatScrollToMessage(messageId) {
  var el = document.querySelector('[data-msg-id="' + messageId + '"]');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.style.background = 'rgba(124, 92, 252, 0.15)';
    setTimeout(function() { el.style.background = ''; }, 2000);
  }
}

function chatShowScrollButton(show) {
  var btn = document.getElementById('chatScrollBtn');
  if (btn) {
    if (show) btn.classList.add('show');
    else btn.classList.remove('show');
  }
}

/* =========================================================
   LIGHTBOX
   ========================================================= */

function chatOpenLightbox(url) {
  var overlay = document.createElement('div');
  overlay.className = 'chat-lightbox';
  overlay.onclick = function() { overlay.remove(); };
  overlay.innerHTML =
    '<button class="chat-lightbox-close" onclick="this.parentElement.remove()"><i class="fas fa-xmark"></i></button>' +
    '<img src="' + url + '">';
  document.body.appendChild(overlay);
}

/* =========================================================
   MOBILE NAVIGATION
   ========================================================= */

function chatMobileShowChat() {
  var sidebar = document.getElementById('chatSidebar');
  var main = document.getElementById('chatMain');
  if (sidebar) sidebar.classList.add('hidden-mobile');
  if (main) main.classList.add('active-mobile');
}

function chatMobileShowList() {
  var sidebar = document.getElementById('chatSidebar');
  var main = document.getElementById('chatMain');
  if (sidebar) sidebar.classList.remove('hidden-mobile');
  if (main) main.classList.remove('active-mobile');

  // Deselect conversation
  var items = document.querySelectorAll('.chat-conv-item');
  for (var i = 0; i < items.length; i++) items[i].classList.remove('active');
}

/* =========================================================
   REFRESH HELPERS
   ========================================================= */

async function chatRefreshConversations() {
  var convs = await chatFetchConversations();
  var list = document.getElementById('chatConvList');
  renderChatConversationList(convs, list);
  updateUnreadBadge(convs);
  updateRequestBadge(convs);
  chatUpdateOtherLastRead(convs);

  // If the open conversation is visible, repaint statuses live
  if (_chatCurrentConv && _chatMessages.length) {
    var container = document.getElementById('chatMessages');
    if (container) renderChatMessages(_chatMessages, container, false);
  }
}

/* Red badge on the Requests tab = unread chats from non-network people */
function updateRequestBadge(convs) {
  var count = 0;
  for (var i = 0; i < (convs || []).length; i++) {
    if (convs[i].isRequest) count += convs[i].unreadCount;
  }
  var badge = document.getElementById('chatRequestBadge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

async function chatRefreshMessages() {
  if (!_chatCurrentConv) return;
  var msgs = await chatFetchMessages(_chatCurrentConv.id, 0, CHAT_PAGE_SIZE);
  _chatMessages = msgs;
  _chatOffset = msgs.length;
  _chatHasMore = msgs.length >= CHAT_PAGE_SIZE;

  var container = document.getElementById('chatMessages');
  renderChatMessages(msgs, container, false);
  chatScrollToBottom(false);
}

function updateUnreadBadge(convs) {
  var total = 0;
  for (var i = 0; i < convs.length; i++) {
    total += convs[i].unreadCount;
  }
  var badge = document.getElementById('chatUnreadBadge');
  if (badge) {
    if (total > 0) {
      badge.textContent = total > 99 ? '99+' : total;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // Also update nav badge if exists
  var navBadge = document.getElementById('chatNavBadge');
  if (navBadge) {
    if (total > 0) {
      navBadge.textContent = total > 99 ? '99+' : total;
      navBadge.style.display = 'flex';
    } else {
      navBadge.style.display = 'none';
    }
  }
}
