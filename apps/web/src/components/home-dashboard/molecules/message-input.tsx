'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { generateUploadSignature, verifyUpload } from '@/services/chat';
import type { Message, MessageType } from '@zync/shared-types';
import { StickerPicker } from './sticker-picker';

function PaperclipIcon({ className }: { className: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>;
}

function ImageIcon({ className }: { className: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x={3} y={3} width={18} height={18} rx={2} /><circle cx={8.5} cy={8.5} r={1.5} /><path d="M3 15l6-6.5 4 4.5 8-8" /></svg>;
}

function SendIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="m4 19 17-7L4 5l1.3 5.1h7.1v3.8H5.3L4 19Z" />
    </svg>
  );
}

function EmojiIcon({ className }: { className: string }) {
return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9" cy="10" r="1" fill="currentColor" />
      <circle cx="15" cy="10" r="1" fill="currentColor" />
      <path d="M8.3 14.2c.8 1.2 2 1.8 3.7 1.8s3-.6 3.7-1.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function StickerIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <circle cx="9" cy="9" r="1.5" fill="currentColor" />
      <circle cx="15" cy="9" r="1.5" fill="currentColor" />
      <path d="M8 15c0 1 2 2 4 2s4-1 4-2" />
    </svg>
  );
}

interface UploadedMedia {
  file: File;
  previewUrl: string;
  type: MessageType;
  uploadType: 'image' | 'video' | 'document';
  fileName?: string;
}

interface SendMessageOptions {
  idempotencyKey?: string;
  deferEmit?: boolean;
  replyTo?: Message['replyTo'];
}

interface QueuedMediaSend {
  idempotencyKey: string;
  previewUrl: string;
  content: string;
  type: MessageType;
}

interface MessageInputProps {
  onSend: (content: string, type: MessageType, mediaUrl?: string, options?: SendMessageOptions) => Promise<string | null | undefined>;
  onCancelPendingMessage?: (idempotencyKey: string) => void;
  onStartTyping: () => void;
  onStopTyping: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  replyingTo?: Message['replyTo'] | null;
  onCancelReply?: () => void;
}

export function MessageInput({
  onSend,
  onCancelPendingMessage,
  onStartTyping,
  onStopTyping,
  isLoading = false,
  disabled = false,
  replyingTo,
  onCancelReply,
}: MessageInputProps) {
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia | null>(null);
  const [queuedMediaSend, setQueuedMediaSend] = useState<QueuedMediaSend | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const stickerButtonRef = useRef<HTMLButtonElement>(null);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const uploadedMediaRef = useRef<UploadedMedia | null>(null);
  const queuedMediaSendRef = useRef<QueuedMediaSend | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const QUICK_EMOJIS = ['😀', '😂', '😍', '👍', '❤️', '🔥', '👏', '🎉'];

  useEffect(() => {
    uploadedMediaRef.current = uploadedMedia;
  }, [uploadedMedia]);

  useEffect(() => {
    queuedMediaSendRef.current = queuedMediaSend;
  }, [queuedMediaSend]);

  useEffect(() => {
    return () => {
      const latestUploaded = uploadedMediaRef.current;
      const latestQueued = queuedMediaSendRef.current;

      if (latestUploaded?.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(latestUploaded.previewUrl);
      }

      if (
        latestQueued?.previewUrl.startsWith('blob:')
        && latestQueued.previewUrl !== latestUploaded?.previewUrl
      ) {
        URL.revokeObjectURL(latestQueued.previewUrl);
      }
    };
  }, []);

  const resetTypingState = useCallback(() => {
    onStopTyping();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
  }, [onStopTyping]);

  const finalizeQueuedMediaSend = useCallback(async (pending: QueuedMediaSend, remoteUrl: string) => {
    try {
      await onSend(pending.content, pending.type, remoteUrl, {
        idempotencyKey: pending.idempotencyKey,
        replyTo: replyingTo ?? undefined,
      });
      onCancelReply?.();
    } catch (error) {
      onCancelPendingMessage?.(pending.idempotencyKey);
      console.error('Finalize media message failed:', error);
    } finally {
      if (pending.previewUrl.startsWith('blob:')) {
        // Delay revoke a bit to avoid flicker while bubble switches to remote URL.
        setTimeout(() => URL.revokeObjectURL(pending.previewUrl), 1200);
      }

      setQueuedMediaSend(null);
      setUploadedMedia(null);
      setIsSending(false);
      setUploading(false);
      setUploadProgress(0);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onCancelPendingMessage, onCancelReply, onSend, replyingTo]);

  const uploadMediaToCloudinary = useCallback(async (media: UploadedMedia): Promise<string> => {
    const signatureData = await generateUploadSignature(media.uploadType);

    const formData = new FormData();
    formData.append('file', media.file);
    formData.append('api_key', signatureData.apiKey);
    formData.append('signature', signatureData.signature);
    formData.append('timestamp', signatureData.timestamp.toString());
    formData.append('folder', signatureData.folder);

    const uploadedData = await new Promise<{ public_id: string; secure_url: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(
        'POST',
        `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/${media.uploadType === 'document' ? 'raw' : media.uploadType}/upload`,
      );

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) {
          return;
        }

        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText) as { public_id: string; secure_url: string });
          } catch {
            reject(new Error('Cloudinary upload failed: invalid response'));
          }
          return;
        }

        try {
          const failed = JSON.parse(xhr.responseText) as { error?: { message?: string } };
          reject(new Error(`Cloudinary upload failed: ${failed.error?.message ?? xhr.status}`));
        } catch {
          reject(new Error(`Cloudinary upload failed: ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Cloudinary upload failed: network error'));
      };

      xhr.send(formData);
    });

    const verifyResult = await verifyUpload(uploadedData.public_id, media.uploadType);
    setUploadProgress(100);
    return verifyResult.secureUrl;
  }, []);

  const handleInputChange = (value: string) => {
    setInput(value);

    if (value.length > 0) {
      // Emit typing_start if interval isn't running (first keystroke or resuming after stop)
      if (!typingIntervalRef.current) {
        onStartTyping();

        // Start throttle interval: re-emit every 2s to refresh Redis TTL
        typingIntervalRef.current = setInterval(() => {
          onStartTyping();
        }, 2000);
      }

      // Reset stop debounce: clears any pending stop, sets new 3s timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        onStopTyping();
        // Cleanup interval when typing stops
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
      }, 3000);
    } else {
      // User cleared all text: stop immediately
      onStopTyping();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
    }
  };

  const handleSend = async () => {
    if ((input.trim() || uploadedMedia) && !isLoading && !disabled && !isSending) {
      const messageContent = input.trim();

      if (uploadedMedia) {
        if (queuedMediaSendRef.current) {
          return;
        }

        setIsSending(true);
        const pendingId = await onSend(messageContent, uploadedMedia.type, uploadedMedia.previewUrl, {
          deferEmit: true,
          replyTo: replyingTo ?? undefined,
        });

        if (!pendingId) {
          setIsSending(false);
          return;
        }

        const pendingMessage: QueuedMediaSend = {
          idempotencyKey: pendingId,
          previewUrl: uploadedMedia.previewUrl,
          content: messageContent,
          type: uploadedMedia.type,
        };

        setQueuedMediaSend(pendingMessage);
        setInput('');
        resetTypingState();

        setUploading(true);
        setUploadProgress(0);

        try {
          const remoteUrl = await uploadMediaToCloudinary(uploadedMedia);
          await finalizeQueuedMediaSend(pendingMessage, remoteUrl);
        } catch (error) {
          onCancelPendingMessage?.(pendingMessage.idempotencyKey);
          if (pendingMessage.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(pendingMessage.previewUrl);
          }
          setQueuedMediaSend(null);
          setUploadedMedia(null);
          setIsSending(false);
          setUploading(false);
          setUploadProgress(0);
          console.error('File upload failed:', error);
          alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        return;
      }

      setIsSending(true);
      await onSend(messageContent, 'text', undefined, { replyTo: replyingTo ?? undefined });
      setInput('');
      resetTypingState();
      onCancelReply?.();

      // Prevent double-click for 500ms
      setTimeout(() => setIsSending(false), 500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  // Cache selected media only. Upload starts after user presses Send.
  const handleUploadFile = async (file: File) => {
    const messageType: MessageType = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
        ? 'video'
        : `file/${file.name}`;
    const previewUrl = URL.createObjectURL(file);

    setUploadedMedia((prev) => {
      if (prev?.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(prev.previewUrl);
      }

      return {
        file,
        previewUrl,
        type: messageType,
        uploadType: file.type.startsWith('image/')
          ? 'image'
          : file.type.startsWith('video/')
            ? 'video'
            : 'document',
        fileName: file.name,
      };
    });

    setUploading(false);
    setUploadProgress(0);
  };

  // Handle paste event (Ctrl+V)
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          await handleUploadFile(file);
        }
        break;
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Let user type a message first. Upload will start after Send.
    await handleUploadFile(file);

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const canSendMedia = Boolean(uploadedMedia);
  const isButtonDisabled = (!input.trim() && !canSendMedia) || disabled || isLoading || isSending;

  const handleSendEmoji = (emoji: string) => {
    if (disabled || isLoading || isSending) {
      return;
    }

    void onSend(emoji, 'sticker', undefined, { replyTo: replyingTo ?? undefined });
    setIsEmojiPickerOpen(false);
    onCancelReply?.();
  };

  const handleSendSticker = async (mediaUrl: string) => {
    if (disabled || isLoading || isSending) {
      return;
    }

    try {
      setIsSending(true);
      await onSend('', 'sticker', mediaUrl, { replyTo: replyingTo ?? undefined });
      setShowStickerPicker(false);
      onCancelReply?.();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="relative border-t border-border bg-bg-card p-4">
      {replyingTo && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-border bg-bg-hover px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-accent">Dang tra loi</p>
            <p className="truncate text-sm text-text-primary">{replyingTo.contentPreview || '[Tin nhan]'}</p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="ml-3 rounded-md bg-bg-primary px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-border-light"
          >
            Huy
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isLoading}
          className="rounded-lg p-2 transition-colors hover:bg-bg-hover disabled:opacity-50 text-text-secondary hover:text-text-primary"
          title="Attachment"
        >
          <PaperclipIcon className="w-5 h-5" />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isLoading}
          className="rounded-lg p-2 transition-colors hover:bg-bg-hover disabled:opacity-50 text-text-secondary hover:text-text-primary"
          title="Images/Videos"
        >
          <ImageIcon className="w-5 h-5" />
        </button>

        <button
          onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
          disabled={disabled || isLoading}
          className="rounded-lg p-2 transition-colors hover:bg-bg-hover disabled:opacity-50 text-text-secondary hover:text-text-primary"
          title="Emoji"
        >
          <EmojiIcon className="w-5 h-5" />
        </button>

        <button
          ref={stickerButtonRef}
          onClick={() => setShowStickerPicker(true)}
          disabled={disabled || isLoading || isSending}
          className="rounded-lg p-2 transition-colors hover:bg-bg-hover disabled:opacity-50 text-text-secondary hover:text-text-primary"
          title="Sticker"
        >
          <StickerIcon className="w-5 h-5" />
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx"
        />
      </div>

      {isEmojiPickerOpen && (
        <div className="emoji-picker-container mb-3 flex flex-wrap gap-2 rounded-lg border p-2 shadow-sm">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleSendEmoji(emoji)}
              className="emoji-button inline-flex h-9 w-9 items-center justify-center rounded-md text-lg hover:scale-110 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {showStickerPicker && (
        <StickerPicker
          isOpen={showStickerPicker}
          onClose={() => setShowStickerPicker(false)}
          onSelectSticker={handleSendSticker}
          triggerRef={stickerButtonRef}
        />
      )}

      {/* Input Area */}
      <div className="flex items-end gap-3">
        <textarea
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Nhập tin nhắn..."
          disabled={disabled || isLoading}
          rows={1}
          className="flex-1 rounded-xl bg-bg-hover px-4 py-3 text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-2 focus:ring-accent-light disabled:opacity-50 border border-border-light"
          style={{
            minHeight: '46px',
            maxHeight: '120px',
          }}
        />

        <button
          onClick={() => {
            void handleSend();
          }}
          disabled={isButtonDisabled}
          className="p-3 bg-accent hover:bg-accent-hover text-white rounded-full transition-all disabled:bg-bg-hover disabled:text-text-tertiary disabled:cursor-not-allowed mb-0.5"
        >
          <SendIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Media Preview */}
      {uploadedMedia && !queuedMediaSend && (
        <div className="mt-3 relative inline-block">
          {uploadedMedia.type === 'image' ? (
            <img
              src={uploadedMedia.previewUrl}
              alt="Preview"
              className={`max-w-xs rounded-lg ${uploading ? 'opacity-50' : ''}`}
            />
          ) : uploadedMedia.type === 'video' ? (
            <video
              src={uploadedMedia.previewUrl}
              controls={!uploading}
              className={`max-w-xs rounded-lg ${uploading ? 'opacity-50' : ''}`}
            />
          ) : (
            <div className={`inline-flex max-w-xs items-center rounded-lg border border-[#2f6657] bg-[#10342b] px-3 py-2 text-sm text-[#d8f8ec] ${uploading ? 'opacity-50' : ''}`}>
              {uploadedMedia.fileName || 'Tệp đính kèm'}
            </div>
          )}

          {/* Spinner only after user pressed Send */}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
              <div className="w-10 h-10 border-4 border-[#33deb3] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          <button
            onClick={() => {
              if (queuedMediaSendRef.current) {
                return;
              }

              if (uploadedMedia.previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(uploadedMedia.previewUrl);
              }
              setUploadedMedia(null);
            }}
            disabled={Boolean(queuedMediaSend)}
            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 w-7 h-7 flex items-center justify-center"
            title="Remove media"
          >
            ✕
          </button>
        </div>
      )}

      {uploadedMedia && queuedMediaSend && uploading && (
        <p className="mt-2 text-xs text-[#8dbcae]">Dang tai media sau khi gui...</p>
      )}
    </div>
  );
}
