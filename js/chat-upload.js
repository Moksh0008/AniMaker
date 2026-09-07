/* =========================================================
   AniMaker v2.1 — Chat Upload
   
   Handles file/image/video uploads for chat attachments
   ========================================================= */

/* ---- Validate chat file ---- */
function chatValidateFile(file) {
  if (!file) return { valid: false, error: 'No file selected' };

  var isImage = CHAT_VALID_IMAGE.indexOf(file.type) !== -1;
  var isVideo = CHAT_VALID_VIDEO.indexOf(file.type) !== -1;

  if (!isImage && !isVideo) {
    return { valid: false, error: 'Please send a JPG, PNG, GIF, WEBP, MP4, or WEBM file.' };
  }

  if (isImage && file.size > CHAT_MAX_IMAGE) {
    return { valid: false, error: 'Image must be less than 10MB.' };
  }

  if (isVideo && file.size > CHAT_MAX_VIDEO) {
    return { valid: false, error: 'Video must be less than 50MB.' };
  }

  return { valid: true, type: isImage ? 'image' : 'video' };
}

/* ---- Show file preview in composer ---- */
function chatShowUploadPreview(file) {
  var validation = chatValidateFile(file);
  if (!validation.valid) {
    showToast(validation.error, 'error');
    return false;
  }

  _chatUploadFile = file;

  var previewContainer = document.getElementById('chatUploadPreview');
  if (!previewContainer) return false;

  var isImage = validation.type === 'image';

  if (isImage) {
    var reader = new FileReader();
    reader.onload = function(e) {
      previewContainer.innerHTML =
        '<img src="' + e.target.result + '">' +
        '<button class="chat-composer-upload-remove" onclick="chatRemoveUpload()"><i class="fas fa-xmark"></i></button>';
      previewContainer.className = 'chat-composer-upload-preview show';
    };
    reader.readAsDataURL(file);
  } else {
    // Video - show thumbnail
    var video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadeddata = function() {
      video.currentTime = 1;
    };
    video.onseeked = function() {
      var canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 120;
      canvas.getContext('2d').drawImage(video, 0, 0, 200, 120);
      previewContainer.innerHTML =
        '<div style="position:relative;">' +
          '<img src="' + canvas.toDataURL() + '" style="width:200px;height:120px;border-radius:12px;object-fit:cover;">' +
          '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;"><i class="fas fa-play-circle" style="font-size:32px;color:rgba(255,255,255,0.8);"></i></div>' +
          '<div style="position:absolute;bottom:4px;left:4px;background:rgba(0,0,0,0.7);padding:2px 6px;border-radius:4px;font-size:11px;color:#fff;">🎬 ' + chatFormatFileSize(file.size) + '</div>' +
          '<button class="chat-composer-upload-remove" onclick="chatRemoveUpload()"><i class="fas fa-xmark"></i></button>' +
        '</div>';
      previewContainer.className = 'chat-composer-upload-preview show';
    };
    video.src = URL.createObjectURL(file);
  }

  // Enable send button
  var sendBtn = document.getElementById('chatSendBtn');
  if (sendBtn) sendBtn.disabled = false;

  return true;
}

function chatRemoveUpload() {
  _chatUploadFile = null;
  var previewContainer = document.getElementById('chatUploadPreview');
  if (previewContainer) {
    previewContainer.innerHTML = '';
    previewContainer.className = 'chat-composer-upload-preview';
  }

  // Disable send if no text
  var input = document.getElementById('chatInput');
  var sendBtn = document.getElementById('chatSendBtn');
  if (sendBtn && input) {
    sendBtn.disabled = !input.value.trim();
  }
}

/* ---- Send attachment ---- */
async function chatSendAttachment(conversationId, replyToId) {
  if (!_chatUploadFile) return null;

  var sendBtn = document.getElementById('chatSendBtn');
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  }

  try {
    var result = await chatSendMediaMessage(conversationId, _chatUploadFile, replyToId);
    chatRemoveUpload();
    return result;
  } catch (e) {
    showToast(e.message || 'Failed to send attachment', 'error');
    throw e;
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
    }
  }
}

/* ---- Format file size ---- */
function chatFormatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}
