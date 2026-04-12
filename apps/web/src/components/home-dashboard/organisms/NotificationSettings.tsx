'use client';

import { useEffect, useRef } from 'react';
import type { NotificationPreferences } from '@/services/notifications';

interface NotificationSettingsProps {
  preferences: NotificationPreferences | null;
  onUpdate: (prefs: { enablePush?: boolean; enableSound?: boolean; enableBadge?: boolean }) => void;
  onClose: () => void;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-3 transition hover:bg-[#0d3228]/50">
      <span className="font-ui-content text-sm text-[#cdece0]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-10 flex-shrink-0 rounded-full transition-colors duration-200 ${
          checked ? 'bg-[#30d7ab]' : 'bg-[#1a3d34]'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 translate-y-1 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}

export function NotificationSettings({ preferences, onUpdate, onClose }: NotificationSettingsProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  if (!preferences) {
    return (
      <div
        ref={panelRef}
        className="absolute right-0 top-[calc(100%+8px)] z-50 w-[320px] rounded-2xl border border-[#104638] bg-[#051f19] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
      >
        <div className="flex justify-center py-6">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#30d7ab] border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-[calc(100%+8px)] z-50 w-[320px] rounded-2xl border border-[#104638] bg-[#051f19] shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
      style={{ animation: 'settingsSlide 0.2s ease-out' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#0d3228] px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#7cb3a1] transition hover:bg-[#0d3228]"
          aria-label="Quay lại"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h3 className="font-ui-title text-sm text-[#e4fff5]">Cài đặt thông báo</h3>
        <div className="w-7" />
      </div>

      {/* Toggles */}
      <div className="px-2 py-2">
        <Toggle
          checked={preferences.enablePush}
          onChange={(v) => onUpdate({ enablePush: v })}
          label="Push notification"
        />
        <Toggle
          checked={preferences.enableSound}
          onChange={(v) => onUpdate({ enableSound: v })}
          label="Âm thanh thông báo"
        />
        <Toggle
          checked={preferences.enableBadge}
          onChange={(v) => onUpdate({ enableBadge: v })}
          label="Hiển thị badge đếm"
        />
      </div>

      {/* Muted conversations info */}
      {preferences.mutedConversations.length > 0 && (
        <div className="border-t border-[#0d3228] px-4 py-3">
          <p className="font-ui-content text-xs text-[#4e8873]">
            {preferences.mutedConversations.length} cuộc trò chuyện đang tắt tiếng
          </p>
        </div>
      )}

      <style jsx>{`
        @keyframes settingsSlide {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
