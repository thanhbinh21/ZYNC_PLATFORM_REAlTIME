'use client';

import { useEffect, useRef, useState } from 'react';
import { FONT_CLASS_MAP } from '../utils';
import { uploadFile } from '@/services/upload';
import type { StoryCreateModalProps, StoryMediaType } from '../stories.types';

const BG_COLORS = [
  '#0d3a30', '#1a1a2e', '#16213e', '#0f3460',
  '#533483', '#e94560', '#1b4332', '#2d6a4f',
  '#7c3aed', '#0891b2', '#b45309', '#be185d',
];

const FONT_STYLES = ['sans', 'serif', 'mono'];
const FONT_LABELS: Record<string, string> = { sans: 'Sans', serif: 'Serif', mono: 'Mono' };

const FONT_SIZES = [
  { label: 'S', value: 'text-lg' },
  { label: 'M', value: 'text-2xl' },
  { label: 'L', value: 'text-3xl' },
];

type TabType = 'text' | 'media';

export function StoryCreateModal({ open, onClose, onSubmit }: StoryCreateModalProps) {
  const [tab, setTab] = useState<TabType>('text');
  const [content, setContent] = useState('');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [fontStyle, setFontStyle] = useState('sans');
  const [fontSize, setFontSize] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTab('text');
      setContent('');
      setBgColor(BG_COLORS[0]);
      setFontStyle('sans');
      setFontSize(1);
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsUploading(false);
      setUploadError(null);
      setIsDragOver(false);
    }
  }, [open]);

  // Lock body scroll on mobile
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    document.body.classList.add('story-viewer-open');
    document.body.style.top = `-${scrollY}px`;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isUploading) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.classList.remove('story-viewer-open');
      document.body.style.top = '';
      window.scrollTo(0, scrollY);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose, isUploading]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  if (!open) return null;

  const isVideo = selectedFile?.type.startsWith('video/') ?? false;
  const detectedMediaType: StoryMediaType = tab === 'text' ? 'text' : isVideo ? 'video' : 'image';

  const canSubmit =
    (tab === 'text' && content.trim().length > 0) ||
    (tab === 'media' && selectedFile !== null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setUploadError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!canSubmit || isUploading) return;

    if (tab === 'text') {
      onSubmit({
        mediaType: 'text',
        content: content.trim(),
        backgroundColor: bgColor,
        fontStyle,
      });
      onClose();
      return;
    }

    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setUploadError(null);
      const mediaUrl = await uploadFile(selectedFile, 'stories');
      onSubmit({ mediaType: detectedMediaType, mediaUrl });
      onClose();
    } catch {
      setUploadError('Upload thất bại. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isUploading) onClose();
  };

  const fontClass = FONT_CLASS_MAP[fontStyle] || 'font-sans';
  const fontSizeClass = FONT_SIZES[fontSize]?.value || 'text-2xl';

  return (
    <div
      className="story-modal-mobile bg-black/75 backdrop-blur-2xl animate-story-backdrop"
      onClick={handleBackdropClick}
    >
      <div className="story-modal-mobile-content animate-story-modal scrollbar-hide">
        {/* Drag handle on mobile */}
        <div className="story-bottom-sheet-handle sm:hidden" />

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-story-border/25 bg-story-surface/95 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-story-accent/20 to-emerald-500/10 text-story-accent sm:h-9 sm:w-9">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 sm:h-5 sm:w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold tracking-tight text-story-text sm:text-lg">Tạo Story</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            aria-label="Đóng"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-story-card/80 text-story-muted transition-all duration-200 active:scale-90 sm:h-9 sm:w-9"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="px-4 pb-4 pt-3 sm:px-6 sm:pb-6 sm:pt-4">
          {/* Tabs */}
          <div className="flex gap-1 rounded-2xl bg-story-bg/80 p-1">
            {(['text', 'media'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={[
                  'flex-1 rounded-xl px-3 py-2 text-[0.8rem] font-medium transition-all duration-300 active:scale-95 sm:py-2.5 sm:text-sm',
                  tab === t
                    ? 'bg-gradient-to-r from-story-accent to-emerald-500 text-story-bg shadow-[0_2px_16px_rgba(48,215,171,0.35)]'
                    : 'text-story-text-dim',
                ].join(' ')}
              >
                <span className="inline-flex items-center gap-1.5">
                  {t === 'text' ? (
                    <>
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                        <path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v9a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 12.5v-9zM5.5 5a.5.5 0 000 1h5a.5.5 0 000-1h-5zM5 8a.5.5 0 01.5-.5h5a.5.5 0 010 1h-5A.5.5 0 015 8zm0 2.5a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5z" />
                      </svg>
                      Văn bản
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                        <path fillRule="evenodd" d="M1.5 2A1.5 1.5 0 000 3.5v9A1.5 1.5 0 001.5 14h13a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0014.5 2h-13zm13 1a.5.5 0 01.5.5v6.06l-2.78-2.78a.5.5 0 00-.707 0L8.44 9.85 5.78 7.19a.5.5 0 00-.707 0L1 11.26V3.5a.5.5 0 01.5-.5h13zM1 12.677l4.427-4.427L8.44 11.26l.34-.34 3.07-3.07 3.15 3.15v1.5a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-.824z" clipRule="evenodd" />
                      </svg>
                      Ảnh / Video
                    </>
                  )}
                </span>
              </button>
            ))}
          </div>

          {/* Text tab */}
          {tab === 'text' && (
            <div className="mt-4 space-y-4 animate-story-fade-up sm:mt-5 sm:space-y-5">
              {/* Live Preview */}
              <div
                className="relative flex aspect-[9/12] items-center justify-center overflow-hidden rounded-2xl border border-white/[0.04] transition-colors duration-500 sm:aspect-[9/14]"
                style={{ backgroundColor: bgColor }}
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.06),transparent_50%)]" />
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Viết nội dung story..."
                  maxLength={500}
                  className={`relative z-10 w-full resize-none bg-transparent px-5 text-center leading-relaxed text-white outline-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)] placeholder:text-white/25 sm:px-6 ${fontClass} ${fontSizeClass}`}
                  rows={4}
                />
                <span className="absolute bottom-3 right-3 text-[0.55rem] font-medium text-white/20 sm:text-[0.6rem]">
                  {content.length}/500
                </span>
              </div>

              {/* Tools panel */}
              <div className="rounded-2xl border border-story-border/20 bg-story-card/30 p-3 space-y-3 sm:p-4 sm:space-y-4">
                {/* Background colors */}
                <div>
                  <p className="mb-2 text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-story-text-dim/60 sm:mb-2.5 sm:text-[0.65rem]">Màu nền</p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {BG_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setBgColor(c)}
                        className={[
                          'h-7 w-7 rounded-lg transition-all duration-300 sm:h-8 sm:w-8 sm:rounded-xl',
                          bgColor === c
                            ? 'scale-110 ring-2 ring-story-accent ring-offset-2 ring-offset-story-surface shadow-[0_0_14px_rgba(48,215,171,0.35)]'
                            : 'active:scale-95',
                        ].join(' ')}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Font controls row */}
                <div className="flex gap-3 sm:gap-4">
                  {/* Font style */}
                  <div className="flex-1">
                    <p className="mb-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-story-text-dim/60 sm:mb-2 sm:text-[0.65rem]">Font</p>
                    <div className="flex gap-1 sm:gap-1.5">
                      {FONT_STYLES.map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setFontStyle(f)}
                          className={[
                            'flex-1 rounded-lg border px-1.5 py-1.5 text-[0.7rem] font-medium transition-all duration-300 active:scale-95 sm:px-2 sm:py-2 sm:text-xs',
                            fontStyle === f
                              ? 'border-story-accent/40 bg-story-accent/10 text-story-accent shadow-[0_0_10px_rgba(48,215,171,0.15)]'
                              : 'border-story-border/30 bg-story-bg/50 text-story-text-dim',
                          ].join(' ')}
                        >
                          {FONT_LABELS[f] ?? f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font size */}
                  <div>
                    <p className="mb-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-story-text-dim/60 sm:mb-2 sm:text-[0.65rem]">Cỡ chữ</p>
                    <div className="flex gap-1 sm:gap-1.5">
                      {FONT_SIZES.map((fs, idx) => (
                        <button
                          key={fs.label}
                          type="button"
                          onClick={() => setFontSize(idx)}
                          className={[
                            'inline-flex h-8 w-8 items-center justify-center rounded-lg border text-[0.7rem] font-bold transition-all duration-300 active:scale-95 sm:h-9 sm:w-9 sm:text-xs',
                            fontSize === idx
                              ? 'border-story-accent/40 bg-story-accent/10 text-story-accent'
                              : 'border-story-border/30 bg-story-bg/50 text-story-text-dim',
                          ].join(' ')}
                        >
                          {fs.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Media tab */}
          {tab === 'media' && (
            <div className="mt-4 space-y-3 animate-story-fade-up sm:mt-5 sm:space-y-4">
              {!selectedFile ? (
                <label
                  className={[
                    'group flex aspect-[9/12] cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl transition-all duration-300 sm:aspect-[9/14] sm:gap-5',
                    'story-create-viewfinder',
                    isDragOver ? '!border-story-accent/60 !bg-story-accent/5 scale-[1.02]' : '',
                  ].join(' ')}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                >
                  {/* Viewfinder corners */}
                  <div className="pointer-events-none absolute inset-3 sm:inset-4">
                    <div className="absolute left-0 top-0 h-5 w-5 border-l-2 border-t-2 border-story-accent/40 rounded-tl-lg sm:h-6 sm:w-6" />
                    <div className="absolute right-0 top-0 h-5 w-5 border-r-2 border-t-2 border-story-accent/40 rounded-tr-lg sm:h-6 sm:w-6" />
                    <div className="absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-story-accent/40 rounded-bl-lg sm:h-6 sm:w-6" />
                    <div className="absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-story-accent/40 rounded-br-lg sm:h-6 sm:w-6" />
                  </div>

                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-story-accent/10 text-story-accent transition-all duration-300 sm:h-16 sm:w-16">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7 sm:h-8 sm:w-8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <div className="relative z-10 text-center">
                    <p className="text-[0.8rem] font-medium text-white/80 sm:text-sm">Nhấn để chọn ảnh/video</p>
                    <p className="mt-1 text-[0.7rem] text-story-muted sm:mt-1.5 sm:text-xs">JPG, PNG, GIF, MP4, WebM</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-story-card">
                  {isVideo && previewUrl ? (
                    <video src={previewUrl} controls playsInline className="aspect-[9/12] w-full object-cover sm:aspect-[9/14]" />
                  ) : previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="aspect-[9/12] w-full object-cover sm:aspect-[9/14]" />
                  ) : null}

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    disabled={isUploading}
                    aria-label="Xóa file"
                    className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/80 backdrop-blur-xl transition-all duration-200 active:scale-90 sm:right-3 sm:top-3 sm:h-9 sm:w-9"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>

                  <div className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/50 px-2.5 py-1 backdrop-blur-xl sm:bottom-3 sm:left-3 sm:px-3 sm:py-1.5">
                    {isVideo ? (
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-story-accent">
                        <path d="M0 1a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H1a1 1 0 01-1-1V1zm4 0v6h8V1H4zm8 8H4v6h8V9zM1 1v2h2V1H1zm2 3H1v2h2V4zM1 7v2h2V7H1zm2 3H1v2h2v-2zm-2 3v2h2v-2H1zM15 1h-2v2h2V1zm-2 3v2h2V4h-2zm2 3h-2v2h2V7zm-2 3v2h2v-2h-2zm2 3h-2v2h2v-2z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-story-accent">
                        <path d="M6.002 5.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                        <path d="M2.002 1a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V3a2 2 0 00-2-2h-12zm12 1a1 1 0 011 1v6.5l-3.777-1.947a.5.5 0 00-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 00-.63.062L1.002 12V3a1 1 0 011-1h12z" />
                      </svg>
                    )}
                    <span className="text-[0.65rem] text-white/70 sm:text-xs">
                      {isVideo ? 'Video' : 'Ảnh'} — {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 sm:px-4 sm:py-2.5">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 shrink-0 text-red-400">
                    <path d="M8.982 1.566a1.13 1.13 0 00-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 01-1.1 0L7.1 5.995A.905.905 0 018 5zm.002 6a1 1 0 110 2 1 1 0 010-2z" />
                  </svg>
                  <p className="text-[0.75rem] text-red-400 sm:text-sm">{uploadError}</p>
                </div>
              )}
            </div>
          )}

          {/* Submit button */}
          <div className="story-safe-bottom">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || isUploading}
              className={[
                'mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[0.8rem] font-semibold sm:mt-6 sm:gap-2.5 sm:py-4 sm:text-sm',
                'transition-all duration-300',
                canSubmit && !isUploading
                  ? 'bg-gradient-to-r from-story-accent to-emerald-500 text-story-bg shadow-[0_4px_28px_rgba(48,215,171,0.35)] active:scale-[0.98]'
                  : 'cursor-not-allowed bg-story-card text-story-muted/50',
              ].join(' ')}
            >
              {isUploading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Đang tải lên...</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                    <path d="M15.964.686a.5.5 0 00-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 00-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 00.886-.083l6-15Zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 00-.154-.154l-.338-.215 7.494-7.494 1.178-.471-.47 1.178Z" />
                  </svg>
                  <span>Đăng Story</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
