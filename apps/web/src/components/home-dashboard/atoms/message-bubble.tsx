'use client';

import Image from 'next/image';
import { MessageStatus } from '@zync/shared-types';

function CheckCircleIcon({ filled, className }: { filled: boolean; className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 12l2.5 2 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface MessageBubbleProps {
  isOwn: boolean;
  content: string;
  type: string;
  mediaUrl?: string;
  status?: MessageStatus;
  timestamp: string;
  senderAvatar?: string;
}

export function MessageBubble({
  isOwn,
  content,
  type,
  mediaUrl,
  status,
  timestamp,
  senderAvatar,
}: MessageBubbleProps) {
  const timeStr = new Date(timestamp).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const hasImageAvatar = Boolean(senderAvatar && /^(https?:\/\/|\/)/.test(senderAvatar));
  const avatarLabel = senderAvatar && !hasImageAvatar
    ? senderAvatar.slice(0, 2).toUpperCase()
    : 'U';

  const statusIcon = {
    sent: <CheckCircleIcon filled={false} className="w-4 h-4 text-[#88b8a7]" />,
    delivered: <CheckCircleIcon filled={false} className="w-4 h-4 text-[#88b8a7]" />,
    read: <CheckCircleIcon filled={true} className="w-4 h-4 text-[#88b8a7]" />,
  }[status || 'sent'];

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

      {/* Message Content */}
      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-xs lg:max-w-md`}>
        {/* Media */}
        {mediaUrl && (type === 'image' || type === 'video') && (
          <div className="mb-1 rounded-lg overflow-hidden">
            {type === 'image' && (
              <Image
                src={mediaUrl}
                alt="message-image"
                width={300}
                height={300}
                className="max-w-xs max-h-80 object-cover"
              />
            )}
            {type === 'video' && (
              <video
                src={mediaUrl}
                controls
                className="max-w-xs max-h-80"
              />
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
          {isOwn && statusIcon}
        </div>
      </div>
    </div>
  );
}
