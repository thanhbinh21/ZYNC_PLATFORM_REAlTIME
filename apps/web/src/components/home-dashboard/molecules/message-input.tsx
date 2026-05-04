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
    <div className="border-t border-border/60 bg-bg-card/80 p-4 backdrop-blur-sm">
      {/* Reply Banner */}
      {replyingTo && (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-accent/20 bg-accent/5 px-4 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent/10">
              <svg className="h-3.5 w-3.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinecap="round">
                <polyline points="9 17 4 12 9 7"/>
                <path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">Dang tra loi</p>
              <p className="truncate text-[13px] text-text-secondary">{replyingTo.contentPreview || '[Tin nhan]'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-text-tertiary hover:bg-border hover:text-text-primary transition-all"
            title="Huy tra loi"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-1 mb-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isLoading}
          className="flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:bg-bg-hover disabled:opacity-40 text-text-tertiary hover:text-accent"
          title="Dinh kem tep"
        >
          <PaperclipIcon className="w-[18px] h-[18px]" />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isLoading}
          className="flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:bg-bg-hover disabled:opacity-40 text-text-tertiary hover:text-accent"
          title="Gui hinh anh"
        >
          <ImageIcon className="w-[18px] h-[18px]" />
        </button>

        <button
          onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
          disabled={disabled || isLoading}
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all disabled:opacity-40 text-text-tertiary hover:text-accent ${isEmojiPickerOpen ? 'bg-accent/10 text-accent' : 'hover:bg-bg-hover'}`}
          title="Bieu tuong cam xuc"
        >
          <EmojiIcon className="w-[18px] h-[18px]" />
        </button>

        <button
          ref={stickerButtonRef}
          onClick={() => setShowStickerPicker(true)}
          disabled={disabled || isLoading || isSending}
          className="flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:bg-bg-hover disabled:opacity-40 text-text-tertiary hover:text-accent"
          title="Sticker"
        >
          <StickerIcon className="w-[18px] h-[18px]" />
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
        <div className="emoji-picker-container mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-border bg-bg-card p-3 shadow-lg">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleSendEmoji(emoji)}
              className="emoji-button inline-flex h-10 w-10 items-center justify-center rounded-xl text-xl hover:bg-bg-hover hover:scale-110 transition-all active:scale-95"
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
      <div className="flex items-end gap-2.5">
        <textarea
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Nhap tin nhan..."
          disabled={disabled || isLoading}
          rows={1}
          className="chat-input-glow flex-1 rounded-2xl bg-bg-hover border border-border-light px-4 py-3 text-[15px] font-medium text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none disabled:opacity-50 transition-all"
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
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl transition-all shadow-sm ${
            isButtonDisabled
              ? 'bg-bg-hover text-text-tertiary cursor-not-allowed'
              : 'bg-gradient-to-br from-accent to-accent-hover text-white hover:shadow-md hover:scale-105 active:scale-95'
          }`}
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
              className={`max-w-[240px] rounded-2xl shadow-sm ${uploading ? 'opacity-50' : ''}`}
            />
          ) : uploadedMedia.type === 'video' ? (
            <video
              src={uploadedMedia.previewUrl}
              controls={!uploading}
              className={`max-w-[240px] rounded-2xl shadow-sm ${uploading ? 'opacity-50' : ''}`}
            />
          ) : (
            <div className={`inline-flex max-w-xs items-center gap-2 rounded-xl border border-border bg-bg-hover px-4 py-2.5 text-sm text-text-primary shadow-sm ${uploading ? 'opacity-50' : ''}`}>
              <svg className="h-5 w-5 text-accent flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span className="truncate">{uploadedMedia.fileName || 'Tep dinh kem'}</span>
            </div>
          )}

          {/* Spinner overlay when uploading */}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/20 backdrop-blur-[2px]">
              <div className="h-10 w-10 rounded-full border-[3px] border-white/30 border-t-white animate-spin shadow-lg" />
            </div>
          )}

          {/* Remove button */}
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
            className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition-all hover:bg-red-600 hover:scale-110 disabled:opacity-50"
            title="Xoa tep"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {uploadedMedia && queuedMediaSend && uploading && (
        <p className="mt-2 flex items-center gap-2 text-xs text-text-tertiary">
          <svg className="h-3.5 w-3.5 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Dang tai media...
        </p>
      )}
    </div>
  );
}
