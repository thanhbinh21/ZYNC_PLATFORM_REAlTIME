'use client';

import { useState } from 'react';
import type { StoryCreateModalProps, StoryMediaType } from '../stories.types';

const BG_COLORS = ['#0d3a30', '#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560', '#1b4332', '#2d6a4f'];
const FONT_STYLES = ['sans', 'serif', 'mono'];

const MEDIA_TABS: { value: StoryMediaType; label: string }[] = [
  { value: 'text', label: 'Văn bản' },
  { value: 'image', label: 'Hình ảnh' },
  { value: 'video', label: 'Video' },
];

export function StoryCreateModal({ open, onClose, onSubmit }: StoryCreateModalProps) {
  const [mediaType, setMediaType] = useState<StoryMediaType>('text');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [fontStyle, setFontStyle] = useState('sans');

  if (!open) return null;

  const canSubmit =
    (mediaType === 'text' && content.trim().length > 0) ||
    ((mediaType === 'image' || mediaType === 'video') && mediaUrl.trim().length > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      mediaType,
      content: mediaType === 'text' ? content.trim() : undefined,
      mediaUrl: mediaType !== 'text' ? mediaUrl.trim() : undefined,
      backgroundColor: mediaType === 'text' ? bgColor : undefined,
      fontStyle: mediaType === 'text' ? fontStyle : undefined,
    });
    setContent('');
    setMediaUrl('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-3xl border border-[#1a5140] bg-[#062920] p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-[#87ac9f] transition hover:text-white"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>

        <h2 className="font-ui-title text-lg text-[#e4fff5]">Tạo Story mới</h2>

        <div className="mt-4 flex gap-2">
          {MEDIA_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setMediaType(tab.value)}
              className={`font-ui-content rounded-full px-4 py-1.5 text-sm transition ${
                mediaType === tab.value
                  ? 'bg-[#30d7ab] text-[#033026]'
                  : 'bg-[#0d3228] text-[#b5d8cc] hover:bg-[#14463a]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {mediaType === 'text' && (
          <div className="mt-4 space-y-3">
            <div
              className="flex min-h-[160px] items-center justify-center rounded-2xl p-4"
              style={{ backgroundColor: bgColor }}
            >
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Viết nội dung story..."
                maxLength={500}
                className={`w-full resize-none bg-transparent text-center text-white outline-none placeholder:text-white/50 font-${fontStyle}`}
                rows={4}
              />
            </div>

            <div>
              <p className="font-ui-meta mb-2 text-xs text-[#87ac9f]">Màu nền</p>
              <div className="flex flex-wrap gap-2">
                {BG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setBgColor(c)}
                    className={`h-8 w-8 rounded-full border-2 transition ${
                      bgColor === c ? 'border-[#30d7ab] scale-110' : 'border-transparent hover:border-white/30'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="font-ui-meta mb-2 text-xs text-[#87ac9f]">Kiểu chữ</p>
              <div className="flex gap-2">
                {FONT_STYLES.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFontStyle(f)}
                    className={`font-ui-content rounded-lg px-3 py-1.5 text-sm capitalize transition ${
                      fontStyle === f
                        ? 'bg-[#30d7ab] text-[#033026]'
                        : 'bg-[#0d3228] text-[#b5d8cc] hover:bg-[#14463a]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {(mediaType === 'image' || mediaType === 'video') && (
          <div className="mt-4 space-y-3">
            <input
              type="url"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder={mediaType === 'image' ? 'URL hình ảnh...' : 'URL video...'}
              className="font-ui-content w-full rounded-xl border border-[#1a5140] bg-[#0b3228] px-4 py-3 text-sm text-[#cdece0] outline-none placeholder:text-[#739f91] focus:border-[#30d7ab]"
            />
            {mediaUrl && mediaType === 'image' && (
              <div className="overflow-hidden rounded-2xl">
                <img src={mediaUrl} alt="Preview" className="h-48 w-full object-cover" />
              </div>
            )}
            {mediaUrl && mediaType === 'video' && (
              <div className="overflow-hidden rounded-2xl">
                <video src={mediaUrl} controls className="h-48 w-full object-cover" />
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`font-ui-title mt-6 w-full rounded-xl py-3 text-base transition ${
            canSubmit
              ? 'bg-[#30d7ab] text-[#033026] hover:brightness-110'
              : 'cursor-not-allowed bg-[#0d3228] text-[#739f91]'
          }`}
        >
          Đăng Story
        </button>
      </div>
    </div>
  );
}
