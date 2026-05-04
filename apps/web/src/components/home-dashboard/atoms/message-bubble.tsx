'use client';

import Image from 'next/image';
import type { MessageStatus, MessageReplyTo, MessageReadParticipantWithTime } from '@zync/shared-types';
import { GetFileIcon } from './file-type-icons';

function FileMessagePreview({ filename, mediaUrl }: { filename: string; mediaUrl?: string }) {
  const extension = filename.split('.').pop() || '';

  return (
    <a
      href={mediaUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-3 rounded-lg border border-border-light bg-bg-hover px-3 py-2 text-sm text-text-primary hover:bg-border transition-colors"
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
    <div className={`flex gap-2.5 mb-4 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar (chi hien thi neu khong phai cua minh) */}
      {!isOwn && hasImageAvatar && senderAvatar && (
        <div className="w-9 h-9 rounded-full bg-accent-light flex-shrink-0 overflow-hidden mt-0.5">
          <Image
            src={senderAvatar}
            alt="avatar"
            width={36}
            height={36}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      {!isOwn && !hasImageAvatar && (
        <div className="w-9 h-9 rounded-full bg-accent-light text-accent text-xs font-bold flex-shrink-0 flex items-center justify-center mt-0.5">
          {avatarLabel}
        </div>
      )}

      {/* Content Column */}
      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%] lg:max-w-[65%]`}>
        {/* Reply Quote */}
        {replyTo?.messageRef && (
          <button
            type="button"
            onClick={() => onJumpToMessage?.(replyTo.messageRef)}
            className={`mb-1.5 w-full max-w-[240px] rounded-xl border px-3 py-2 text-left text-xs transition-all ${
              isOwn
                ? 'border-accent/30 bg-accent/10 text-text-primary hover:bg-accent/20'
                : 'border-border bg-bg-hover text-text-primary hover:bg-border-light'
            }`}
            title="Di den tin nhan goc"
          >
            <p className={`mb-0.5 text-[10px] uppercase tracking-wide font-semibold ${isOwn ? 'text-accent' : 'text-text-tertiary'}`}>
              <svg className="inline h-3 w-3 mr-1 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 17 4 12 9 7"/>
                <path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
              </svg>
              Tra loi
            </p>
            {replyTo.senderDisplayName && (
              <p className="mb-0.5 truncate font-semibold text-text-primary">{replyTo.senderDisplayName}</p>
            )}
            <p className="truncate text-text-secondary">{replyTo.contentPreview || '[Tin nhan]'}</p>
          </button>
        )}

        {/* Media */}
        {mediaUrl && (type === 'image' || type === 'video' || type?.startsWith('file/') || type === 'sticker') && (
          <div className="mb-1 rounded-2xl overflow-hidden relative shadow-sm">
            {type === 'image' && (
              isPendingLocalMedia ? (
                <img
                  src={mediaUrl}
                  alt="message-image"
                  className="max-w-[260px] max-h-72 object-cover"
                />
              ) : (
                <Image
                  src={mediaUrl}
                  alt="message-image"
                  width={280}
                  height={280}
                  className="max-w-[260px] max-h-72 object-cover"
                />
              )
            )}
            {type === 'video' && (
              <video
                src={mediaUrl}
                controls={!isPendingLocalMedia}
                className="max-w-[260px] max-h-72 rounded-2xl"
              />
            )}
            {type === 'sticker' && (
              isPendingLocalMedia ? (
                <img src={mediaUrl} alt="sticker" className="h-[80px] object-contain" />
              ) : (
                <Image
                  src={mediaUrl}
                  alt="sticker"
                  width={80}
                  height={80}
                  className="h-[80px] w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
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
              <div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[2px]">
                <div className="h-9 w-9 rounded-full border-[3px] border-white/30 border-t-white animate-spin" />
              </div>
            )}
          </div>
        )}

        {/* Text Bubble */}
        {content && (
          <div
            className={`px-4 py-2.5 rounded-2xl break-words shadow-sm ${
              isOwn
                ? 'bg-gradient-to-br from-accent to-accent-hover text-white rounded-br-sm'
                : 'rounded-bl-sm border bg-bg-card'
            }`}
          >
            <p className="text-[15px] leading-[1.45] font-medium">{content}</p>
          </div>
        )}

        {/* Timestamp + Status + Reactions */}
        <div className={`flex items-center gap-1.5 mt-1 text-[11px] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-text-tertiary">{timeStr}</span>

          {moderationWarning && type !== 'system-recall' && (
            <span className="inline-flex items-center gap-0.5 text-yellow-500" title="Tin nhan canh bao noi dung">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
              </svg>
            </span>
          )}

          {type !== 'system-recall' && isOwn && (
            <span className="text-text-tertiary">
              {status === 'sent' && (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
              {status === 'delivered' && (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                  <polyline points="20 12 9 23 4 18"/>
                </svg>
              )}
              {status === 'read' && (
                <svg className="h-4 w-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                  <polyline points="20 12 9 23 4 18"/>
                </svg>
              )}
            </span>
          )}

          {hasReadPreview && (
            <button
              type="button"
              onClick={onReadPreviewPress}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-hover px-1.5 py-0.5 text-[10px] text-text-secondary hover:bg-border transition-colors"
              title="Xem chi tiet da xem"
            >
              <span className="inline-flex -space-x-1.5">
                {previewReaders.slice(0, 3).map((reader) => {
                  const hasAvatar = Boolean(reader.avatarUrl && /^(https?:\/\/|\/)/.test(reader.avatarUrl));
                  return hasAvatar ? (
                    <Image
                      key={`read-${reader.userId}`}
                      src={reader.avatarUrl!}
                      alt={reader.displayName || 'reader'}
                      width={14}
                      height={14}
                      className="h-3.5 w-3.5 rounded-full border border-white object-cover"
                    />
                  ) : (
                    <span
                      key={`read-${reader.userId}`}
                      className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white bg-accent-light text-[8px] font-bold text-accent"
                    >
                      {(reader.displayName || 'U').slice(0, 1).toUpperCase()}
                    </span>
                  );
                })}
              </span>
              {visibleReadCount > 3 && (
                <span className="text-[10px] text-text-tertiary">+{visibleReadCount - 3}</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
