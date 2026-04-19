'use client';

import Image from 'next/image';
import type { MessageStatus, MessageReplyTo, MessageReadParticipantWithTime } from '@zync/shared-types';
import { GetFileIcon } from './file-type-icons';

function CheckCircleIcon({ filled, className }: { filled: boolean; className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 12l2.5 2 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FileMessagePreview({ filename, mediaUrl }: { filename: string; mediaUrl?: string }) {
  const extension = filename.split('.').pop() || '';

  return (
    <a
      href={mediaUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-3 rounded-lg border border-[#2f6657] bg-[#10342b] px-3 py-2 text-sm text-[#d8f8ec] hover:bg-[#164336] transition-colors"
    >
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
        <GetFileIcon extension={extension} />
      </div>
      <span className="truncate max-w-xs">{filename}</span>
    </a>
  );
}

interface MessageBubbleProps {
  isOwn: boolean;
  content: string;
  type: string;
  mediaUrl?: string;
  replyTo?: MessageReplyTo;
  onJumpToMessage?: (messageRef: string) => void;
  moderationWarning?: boolean;
  status?: MessageStatus;
  readByPreview?: MessageReadParticipantWithTime[];
  readByCount?: number;
  onReadPreviewPress?: () => void;
  timestamp: string;
  senderAvatar?: string;
}

export function MessageBubble({
  isOwn,
  content,
  type,
  mediaUrl,
  replyTo,
  onJumpToMessage,
  moderationWarning = false,
  status,
  readByPreview = [],
  readByCount = 0,
  onReadPreviewPress,
  timestamp,
  senderAvatar,
}: MessageBubbleProps) {
  const isPendingLocalMedia = Boolean(mediaUrl?.startsWith('blob:'));

  const timeStr = new Date(timestamp).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const hasImageAvatar = Boolean(senderAvatar && /^(https?:\/\/|\/)/.test(senderAvatar));
  const avatarLabel = senderAvatar && !hasImageAvatar
    ? senderAvatar.slice(0, 2).toUpperCase()
    : 'U';

  const previewReaders = Array.isArray(readByPreview) ? readByPreview : [];
  const visibleReadCount = readByCount > 0 ? readByCount : previewReaders.length;
  const hasReadPreview = isOwn && type !== 'system-recall' && status === 'read' && previewReaders.length > 0;

  return (
    <div className={`flex gap-2 mb-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar (chỉ hiển thị nếu không phải của mình) */}
      {!isOwn && hasImageAvatar && senderAvatar && (
        <div className="w-8 h-8 rounded-full bg-[#2f6657] flex-shrink-0">
          <Image
            src={senderAvatar}
            alt="avatar"
            width={32}
            height={32}
            className="w-full h-full rounded-full object-cover"
          />
        </div>
      )}
      {!isOwn && !hasImageAvatar && (
        <div className="w-8 h-8 rounded-full bg-[#2f6657] text-[#dffef1] text-xs font-semibold flex-shrink-0 flex items-center justify-center">
          {avatarLabel}
        </div>
      )}

      {/* Media */}
      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-xs lg:max-w-md`}>
        {replyTo?.messageRef && (
          <button
            type="button"
            onClick={() => onJumpToMessage?.(replyTo.messageRef)}
            className={`mb-1 w-full rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors ${
              isOwn
                ? 'border-[#0d5a48] bg-[#22b894]/30 text-[#05382e] hover:bg-[#22b894]/40'
                : 'border-[#2d6a58] bg-[#0b2f26]/70 text-[#bce8d9] hover:bg-[#124236]/80'
            }`}
            title="Di den tin nhan goc"
          >
            <p className={`mb-0.5 text-[10px] uppercase tracking-wide ${isOwn ? 'text-[#075445]' : 'text-[#89d8bf]'}`}>Tra loi</p>
            {replyTo.senderDisplayName && (
              <p className={`mb-0.5 truncate text-sm font-semibold ${isOwn ? 'text-[#043329]' : 'text-[#d8f8ec]'}`}>
                {replyTo.senderDisplayName}
              </p>
            )}
            <p className="truncate">{replyTo.contentPreview || '[Tin nhan]'}</p>
          </button>
        )}

        {/* Media */}
        {mediaUrl && (type === 'image' || type === 'video' || type?.startsWith('file/') || type === 'sticker') && (
          <div className="mb-1 rounded-lg overflow-hidden relative">
            {type === 'image' && (
              isPendingLocalMedia ? (
                <img
                  src={mediaUrl}
                  alt="message-image"
                  className="max-w-xs max-h-80 object-cover"
                />
              ) : (
                <Image
                  src={mediaUrl}
                  alt="message-image"
                  width={300}
                  height={300}
                  className="max-w-xs max-h-80 object-cover"
                />
              )
            )}
            {type === 'video' && (
              <video
                src={mediaUrl}
                controls={!isPendingLocalMedia}
                className="max-w-xs max-h-80"
              />
            )}
            {type === 'sticker' && (
              isPendingLocalMedia ? (
                <img
                  src={mediaUrl}
                  alt="sticker"
                  className="h-[100px] object-contain"
                />
              ) : (
                <Image
                  src={mediaUrl}
                  alt="sticker"
                  width={100}
                  height={100}
                  className="h-[100px] w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => window.open(mediaUrl, '_blank')}
                />
              )
            )}
            {type?.startsWith('file/') && (
              <FileMessagePreview
                filename={type.replace('file/', '')}
                mediaUrl={mediaUrl}
              />
            )}

            {isPendingLocalMedia && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                <div className="h-8 w-8 rounded-full border-4 border-[#b8f2e1] border-t-transparent animate-spin" />
              </div>
            )}
          </div>
        )}

        {/* Text Bubble */}
        {content && (
          <div
            className={`px-4 py-2 rounded-2xl break-words ${
              isOwn
                ? 'bg-[#35e1b7] text-[#05382e] rounded-br-none'
                : 'bg-[#102b24] text-[#d8f8ec] rounded-bl-none'
            }`}
          >
            <p className="text-sm">{content}</p>
          </div>
        )}

        {/* Timestamp + Status */}
        <div className={`flex items-center gap-1 mt-1 text-xs text-[#88b8a7] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
          <span>{timeStr}</span>
          {moderationWarning && type !== 'system-recall' && (
            <span className="inline-flex items-center text-[11px] text-yellow-400" title="Tin nhan canh bao noi dung">
              ⚠
            </span>
          )}
          {type !== 'system-recall' && isOwn && status === 'delivered' && (
            <CheckCircleIcon filled={false} className="w-4 h-4 text-[#88b8a7]" />
          )}
          {hasReadPreview && (
            <button
              type="button"
              onClick={onReadPreviewPress}
              className="inline-flex items-center gap-1 rounded-full border border-[#2f6657] bg-[#0f4335]/70 px-1.5 py-0.5 hover:bg-[#165647]"
              title="Xem chi tiet da xem"
            >
              <span className="inline-flex -space-x-2">
                {previewReaders.map((reader) => {
                  const hasAvatar = Boolean(reader.avatarUrl && /^(https?:\/\/|\/)/.test(reader.avatarUrl));
                  return hasAvatar ? (
                    <Image
                      key={`read-${reader.userId}`}
                      src={reader.avatarUrl!}
                      alt={reader.displayName || 'reader'}
                      width={16}
                      height={16}
                      className="h-4 w-4 rounded-full border border-[#0d2f26] object-cover"
                    />
                  ) : (
                    <span
                      key={`read-${reader.userId}`}
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#0d2f26] bg-[#1f5c4c] text-[9px] font-semibold text-[#dffef2]"
                    >
                      {(reader.displayName || 'U').slice(0, 1).toUpperCase()}
                    </span>
                  );
                })}
              </span>
              {visibleReadCount > previewReaders.length && (
                <span className="text-[10px] text-[#bde8d9]">+{visibleReadCount - previewReaders.length}</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
