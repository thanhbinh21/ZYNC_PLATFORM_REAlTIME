'use client';

import { useState, useRef } from 'react';

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

interface MessageInputProps {
  onSend: (content: string, type: 'text' | 'image' | 'video') => void;
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
    if (input.trim() && !isLoading && !disabled) {
      onSend(input.trim(), 'text');
      setInput('');
      onStopTyping();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // TODO: Upload file and get mediaUrl
      // For now, just handle the file selection
      const type = file.type.startsWith('image/') ? 'image' : 'video';
      const reader = new FileReader();
      reader.onloadend = () => {
        onSend(`Shared a ${type}`, type as any);
      };
      reader.readAsDataURL(file);
    }
  };

  const isButtonDisabled = !input.trim() || disabled || isLoading;

  return (
    <div className="border-t border-[#114538] p-4 bg-[#0d2c24]">
      {/* Action Buttons */}
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isLoading}
          className="p-2 hover:bg-[#164336] rounded-lg transition-colors disabled:opacity-50"
          title="Attachment"
        >
          <PaperclipIcon className="w-5 h-5 text-[#96c5b5]" />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isLoading}
          className="p-2 hover:bg-[#164336] rounded-lg transition-colors disabled:opacity-50"
          title="Images/Videos"
        >
          <ImageIcon className="w-5 h-5 text-[#96c5b5]" />
        </button>

        <button
          disabled={disabled || isLoading}
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
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập tin nhắn..."
          disabled={disabled || isLoading}
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
    </div>
  );
}
