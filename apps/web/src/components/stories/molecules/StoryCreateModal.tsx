'use client';

import { useEffect, useRef, useState } from 'react';
import { FONT_CLASS_MAP } from '../utils';
import { uploadFile } from '@/services/upload';
import type { StoryCreateModalProps, StoryMediaType } from '../stories.types';

const BG_COLORS = ['#0d3a30', '#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560', '#1b4332', '#2d6a4f'];
const FONT_STYLES = ['sans', 'serif', 'mono'];

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
      onSubmit({
        mediaType: detectedMediaType,
        mediaUrl,
      });
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative mx-4 w-full max-w-md rounded-3xl border border-[#1a5140] bg-[#062920] p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          disabled={isUploading}
          aria-label="Đóng"
          className="absolute right-4 top-4 text-[#87ac9f] transition hover:text-white disabled:opacity-50"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>

        <h2 className="font-ui-title text-lg text-[#e4fff5]">Tạo Story mới</h2>

        {/* Tabs */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setTab('text')}
            className={`font-ui-content rounded-full px-4 py-1.5 text-sm transition ${
              tab === 'text'
                ? 'bg-[#30d7ab] text-[#033026]'
                : 'bg-[#0d3228] text-[#b5d8cc] hover:bg-[#14463a]'
            }`}
          >
            Văn bản
          </button>
          <button
            type="button"
            onClick={() => setTab('media')}
            className={`font-ui-content rounded-full px-4 py-1.5 text-sm transition ${
              tab === 'media'
                ? 'bg-[#30d7ab] text-[#033026]'
                : 'bg-[#0d3228] text-[#b5d8cc] hover:bg-[#14463a]'
            }`}
          >
            Hình ảnh / Video
          </button>
        </div>

        {/* Text tab */}
        {tab === 'text' && (
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
                className={`w-full resize-none bg-transparent text-center text-white outline-none placeholder:text-white/50 ${fontClass}`}
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

        {/* Media upload tab */}
        {tab === 'media' && (
          <div className="mt-4 space-y-3">
            {!selectedFile ? (
              <label className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#1a5140] bg-[#0b3228] transition hover:border-[#30d7ab]/60 hover:bg-[#0d3a30]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-10 w-10 text-[#30d7ab]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span className="font-ui-content text-sm text-[#b5d8cc]">Chọn hình ảnh hoặc video</span>
                <span className="font-ui-meta text-xs text-[#739f91]">JPG, PNG, GIF, MP4, WebM</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative overflow-hidden rounded-2xl">
                {isVideo && previewUrl ? (
                  <video src={previewUrl} controls className="h-52 w-full object-cover" />
                ) : previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="h-52 w-full object-cover" />
                ) : null}
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  disabled={isUploading}
                  aria-label="Xóa file"
                  className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-red-500/80 disabled:opacity-50"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
                <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5">
                  <span className="font-ui-meta text-xs text-white/80">
                    {isVideo ? 'Video' : 'Hình ảnh'} — {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>
              </div>
            )}

            {uploadError && (
              <p className="font-ui-content text-sm text-red-400">{uploadError}</p>
            )}
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || isUploading}
          className={`font-ui-title mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-base transition ${
            canSubmit && !isUploading
              ? 'bg-[#30d7ab] text-[#033026] hover:brightness-110'
              : 'cursor-not-allowed bg-[#0d3228] text-[#739f91]'
          }`}
        >
          {isUploading && (
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isUploading ? 'Đang tải lên...' : 'Đăng Story'}
        </button>
      </div>
    </div>
  );
}
