'use client';

import { useState, useRef } from 'react';
import { generateUploadSignature, verifyUpload } from '@/services/chat';

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
  );}

interface UploadedMedia {
  url: string;
  type: 'image' | 'video';
}

interface MessageInputProps {
  onSend: (content: string, type: 'text' | 'image' | 'video', mediaUrl?: string) => void;
  onStartTyping: () => void;
  onStopTyping: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function MessageInput({
  onSend,
  onStartTyping,
  onStopTyping,
  isLoading = false,
  disabled = false,
}: MessageInputProps) {
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia | null>(null);
  const [isSending, setIsSending] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (value: string) => {
    const wasEmpty = input.length === 0;
    setInput(value);

    // Emit typing_start if just started typing
    if (wasEmpty && value.length > 0) {
      onStartTyping();
    }

    // Debounce typing_stop event
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (value.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        onStopTyping();
      }, 3000);
    }
  };

  const handleSend = () => {
    if ((input.trim() || uploadedMedia) && !isLoading && !disabled && !isSending) {
      setIsSending(true);
      const messageContent = input.trim();
      onSend(messageContent, uploadedMedia?.type || 'text', uploadedMedia?.url);
      setInput('');
      setUploadedMedia(null);
      onStopTyping();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Prevent double-click for 500ms
      setTimeout(() => setIsSending(false), 500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Shared upload logic for both file select and paste
  const handleUploadFile = async (file: File, autoSend = false) => {
    setUploading(true);
    try {
      const fileType = file.type.startsWith('image/') ? 'image' : 'video';
      
      // Step 1: Get upload signature from server
      const signatureData = await generateUploadSignature(fileType);
      console.log('✅ Step 1: Got signature');
      
      // Step 2: Upload file to Cloudinary using FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', signatureData.apiKey);
      formData.append('signature', signatureData.signature);
      formData.append('timestamp', signatureData.timestamp.toString());
      formData.append('folder', signatureData.folder);
      formData.append('public_id', signatureData.publicIdPrefix);
      
      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/${fileType === 'image' ? 'image' : 'video'}/upload`,
        {
          method: 'POST',
          body: formData,
        },
      );

      if (!uploadResponse.ok) {
        throw new Error(`Cloudinary upload failed: ${uploadResponse.status}`);
      }

      const uploadedData = await uploadResponse.json() as { public_id: string; secure_url: string };
      console.log('✅ Step 2: Uploaded to Cloudinary');

      // Step 3: Verify upload with backend
      const verifyResult = await verifyUpload(uploadedData.public_id, fileType);
      console.log('✅ Step 3: Verified with backend');

      const media: UploadedMedia = {
        url: verifyResult.secureUrl,
        type: fileType as 'image' | 'video',
      };

      if (autoSend) {
        // // Auto-send (from button click): send immediately with default message
        await onSend('', media.type, media.url);
        console.log('✅ Step 4: Media sent');
      } else {
        // From paste: store for user to add text and send
        setUploadedMedia(media);
        console.log('📸 Media ready to send with message');
      }
    } catch (error) {
      console.error('❌ File upload failed:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
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
          await handleUploadFile(file, false);
        }
        break;
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Auto-send when using file picker (button clicks)
    await handleUploadFile(file, true);

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isButtonDisabled = (!input.trim() && !uploadedMedia) || disabled || isLoading || uploading || isSending;

  return (
    <div className="border-t border-[#114538] p-4 bg-[#0d2c24]">
      {/* Action Buttons */}
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isLoading || uploading}
          className="p-2 hover:bg-[#164336] rounded-lg transition-colors disabled:opacity-50"
          title="Attachment"
        >
          <PaperclipIcon className="w-5 h-5 text-[#96c5b5]" />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isLoading || uploading}
          className="p-2 hover:bg-[#164336] rounded-lg transition-colors disabled:opacity-50"
          title="Images/Videos"
        >
          <ImageIcon className="w-5 h-5 text-[#96c5b5]" />
        </button>

        <button
          disabled={disabled || isLoading || uploading}
          className="p-2 hover:bg-[#164336] rounded-lg transition-colors disabled:opacity-50"
          title="Emoji"
        >
          <EmojiIcon className="w-5 h-5 text-[#96c5b5]" />
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx"
        />
      </div>

      {/* Input Area */}
      <div className="flex items-end gap-3">
        <textarea
          value={uploading ? `${input || ''}` : input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={uploading ? 'Uploading...' : 'Nhập tin nhắn...'}
          disabled={disabled || isLoading || uploading}
          rows={1}
          className="flex-1 bg-[#0d2c24] text-[#dffcf2] placeholder:text-[#80ac9d] rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#33deb3] disabled:opacity-50"
          style={{
            minHeight: '40px',
            maxHeight: '120px',
          }}
        />

        <button
          onClick={handleSend}
          disabled={isButtonDisabled}
          className="p-2 bg-[#33deb3] hover:brightness-110 rounded-full transition-all disabled:bg-[#0d342a] disabled:cursor-not-allowed"
        >
          <SendIcon className={`w-5 h-5 transition-colors ${isButtonDisabled ? 'text-[#80ac9d]' : 'text-[#043329]'}`} />
        </button>
      </div>

      {/* Media Preview */}
      {uploadedMedia && (
        <div className="mt-3 relative">
          {uploadedMedia.type === 'image' ? (
            <img
              src={uploadedMedia.url}
              alt="Preview"
              className="max-w-xs rounded-lg"
            />
          ) : (
            <video
              src={uploadedMedia.url}
              controls
              className="max-w-xs rounded-lg"
            />
          )}
          <button
            onClick={() => setUploadedMedia(null)}
            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 w-7 h-7 flex items-center justify-center"
            title="Remove media"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
