'use client';

import { useEffect, useRef, useState } from 'react';
import { FONT_CLASS_MAP } from '../utils';
import { uploadFile } from '@/services/upload';
import type { StoryCreateModalProps, StoryMediaType } from '../stories.types';

const BG_COLORS = [
  '#0d3a30', '#1a1a2e', '#16213e', '#0f3460',
  '#533483', '#e94560', '#1b4332', '#2d6a4f',
];
const FONT_STYLES = ['sans', 'serif', 'mono'];
const FONT_LABELS: Record<string, string> = { sans: 'Sans', serif: 'Serif', mono: 'Mono' };

type TabType = 'text' | 'media';

export function StoryCreateModal({ open, onClose, onSubmit }: StoryCreateModalProps) {
  const [tab, setTab] = useState<TabType>('text');
  const [content, setContent] = useState('');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [fontStyle, setFontStyle] = useState('sans');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTab('text');
      setContent('');
      setBgColor(BG_COLORS[0]);
      setFontStyle('sans');
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsUploading(false);
      setUploadError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isUploading) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl animate-story-backdrop"
      onClick={handleBackdropClick}
    >
      <div className="relative mx-4 w-full max-w-[440px] overflow-hidden rounded-3xl border border-white/[0.06] bg-story-surface shadow-[0_32px_80px_-16px_rgba(0,0,0,0.7)] animate-story-modal">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-story-border/30 px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight text-story-text">Tạo Story mới</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            aria-label="Đóng"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-story-card text-story-muted transition-all duration-200 hover:bg-story-border/50 hover:text-white disabled:opacity-50"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6 pt-4">
          {/* Tabs */}
          <div className="flex gap-1 rounded-2xl bg-story-bg/80 p-1">
            {(['text', 'media'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={[
                  'flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300',
                  tab === t
                    ? 'bg-gradient-to-r from-story-accent to-emerald-500 text-story-bg shadow-[0_2px_12px_rgba(48,215,171,0.3)]'
                    : 'text-story-text-dim hover:text-white',
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
                      Hình ảnh / Video
                    </>
                  )}
                </span>
              </button>
            ))}
          </div>

          {/* Text tab */}
          {tab === 'text' && (
            <div className="mt-5 space-y-5 animate-story-fade-up">
              {/* Preview area */}
              <div
                className="flex min-h-[200px] items-center justify-center rounded-2xl border border-white/[0.04] p-6 transition-colors duration-500"
                style={{ backgroundColor: bgColor }}
              >
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Viết nội dung story..."
                  maxLength={500}
                  className={`w-full resize-none bg-transparent text-center text-xl leading-relaxed text-white outline-none placeholder:text-white/30 ${fontClass}`}
                  rows={4}
                />
              </div>

              {/* Background color */}
              <div>
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-story-text-dim/70">Màu nền</p>
                <div className="flex flex-wrap gap-2.5">
                  {BG_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setBgColor(c)}
                      className={[
                        'h-9 w-9 rounded-xl transition-all duration-300',
                        bgColor === c
                          ? 'scale-110 ring-2 ring-story-accent ring-offset-2 ring-offset-story-surface shadow-[0_0_12px_rgba(48,215,171,0.3)]'
                          : 'hover:scale-105 hover:ring-1 hover:ring-white/20',
                      ].join(' ')}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Font style */}
              <div>
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-story-text-dim/70">Phông chữ</p>
                <div className="flex gap-2">
                  {FONT_STYLES.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFontStyle(f)}
                      className={[
                        'rounded-xl border px-5 py-2.5 text-sm font-medium transition-all duration-300',
                        fontStyle === f
                          ? 'border-story-accent/40 bg-story-accent/10 text-story-accent shadow-[0_0_12px_rgba(48,215,171,0.15)]'
                          : 'border-story-border/40 bg-story-card text-story-text-dim hover:border-story-accent/20 hover:text-white',
                      ].join(' ')}
                    >
                      {FONT_LABELS[f] ?? f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Media tab */}
          {tab === 'media' && (
            <div className="mt-5 space-y-4 animate-story-fade-up">
              {!selectedFile ? (
                <label className="group flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed border-story-border/50 bg-story-bg/50 transition-all duration-300 hover:border-story-accent/40 hover:bg-story-card/30">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-story-accent/10 text-story-accent transition-all duration-300 group-hover:scale-110 group-hover:bg-story-accent/15 group-hover:shadow-[0_0_24px_rgba(48,215,171,0.2)]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-white/80">Chọn hình ảnh hoặc video</p>
                    <p className="mt-1 text-xs text-story-muted">JPG, PNG, GIF, MP4, WebM</p>
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
                <div className="group relative overflow-hidden rounded-2xl border border-white/[0.04] bg-story-card">
                  {isVideo && previewUrl ? (
                    <video src={previewUrl} controls className="h-60 w-full object-cover" />
                  ) : previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="h-60 w-full object-cover" />
                  ) : null}

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    disabled={isUploading}
                    aria-label="Xóa file"
                    className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/80 backdrop-blur-xl transition-all duration-200 hover:bg-red-500/60 hover:text-white hover:scale-110 disabled:opacity-50"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>

                  <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/50 px-3 py-1.5 backdrop-blur-xl">
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
                    <span className="text-xs text-white/70">
                      {isVideo ? 'Video' : 'Hình ảnh'} — {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 shrink-0 text-red-400">
                    <path d="M8.982 1.566a1.13 1.13 0 00-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 01-1.1 0L7.1 5.995A.905.905 0 018 5zm.002 6a1 1 0 110 2 1 1 0 010-2z" />
                  </svg>
                  <p className="text-sm text-red-400">{uploadError}</p>
                </div>
              )}
            </div>
          )}

          {/* Submit button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || isUploading}
            className={[
              'mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold',
              'transition-all duration-300',
              canSubmit && !isUploading
                ? 'bg-gradient-to-r from-story-accent to-emerald-500 text-story-bg shadow-[0_4px_24px_rgba(48,215,171,0.3)] hover:shadow-[0_8px_32px_rgba(48,215,171,0.4)] hover:brightness-110 active:scale-[0.98]'
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
  );
}
