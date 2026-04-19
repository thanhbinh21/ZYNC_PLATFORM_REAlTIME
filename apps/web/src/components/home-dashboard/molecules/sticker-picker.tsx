'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { IStickerPack, ISticker } from '@zync/shared-types';

interface StickerPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSticker: (mediaUrl: string) => void;
}

export function StickerPicker({ isOpen, onClose, onSelectSticker }: StickerPickerProps) {
  const [stickerPacks, setStickerPacks] = useState<(IStickerPack & { stickers: ISticker[] })[]>([]);
  const [selectedPackId, setSelectedPackId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Fetch sticker packs when picker opens
  useEffect(() => {
    if (isOpen && stickerPacks.length === 0) {
      fetchStickerPacks();
    }
  }, [isOpen, stickerPacks.length]);

  const fetchStickerPacks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/stickers');
      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setStickerPacks(data.data);
        if (data.data.length > 0) {
          setSelectedPackId(data.data[0].packId);
        }
      } else {
        setError('Failed to load sticker packs');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load stickers';
      console.error('Failed to fetch sticker packs:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const selectedPack = stickerPacks.find(p => p.packId === selectedPackId);
  const filteredStickers = (selectedPack?.stickers || []).filter(s =>
    s.alt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.stickerId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div ref={pickerRef} className="fixed bottom-24 left-4 z-[9999] bg-gradient-to-b from-[#0f4738] to-[#052f24] rounded-2xl shadow-2xl border border-[#2d7a66] w-80 max-h-96 flex flex-col overflow-hidden">
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-40 text-[#9bc4b6] text-sm">
          Đang tải...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center justify-center h-40 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Pack Tabs */}
          <div className="flex gap-2 px-3 py-2 overflow-x-auto border-b border-[#2d7a66] bg-[#0a2f27]/30 scrollbar-hide">
            {stickerPacks.map(pack => (
              <button
                key={pack.packId}
                onClick={() => {
                  setSelectedPackId(pack.packId);
                  setSearchQuery('');
                }}
                className={`flex-shrink-0 p-1.5 rounded-lg transition-all ${
                  selectedPackId === pack.packId
                    ? 'bg-[#10b981]'
                    : 'bg-[#0f4738] hover:bg-[#155d4a]'
                }`}
                title={pack.packName}
              >
                {pack.icon ? (
                  <div className="relative w-6 h-6">
                    <Image
                      src={pack.icon}
                      alt={pack.packName}
                      fill
                      className="rounded object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-6 h-6 flex items-center justify-center text-xs font-semibold text-[#d1fae5]">
                    {pack.packName[0]}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="px-3 py-2 border-b border-[#2d7a66] bg-[#0d3a2f]/30">
            <input
              type="text"
              placeholder="Tìm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#0f4738] border border-[#2d7a66] rounded-lg text-xs text-[#d1fae5] placeholder:text-[#9bc4b6] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
            />
          </div>

          {/* Sticker Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            {filteredStickers.length > 0 ? (
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, minmax(60px, 1fr))' }}>
                {filteredStickers.map(sticker => (
                  <button
                    key={sticker.stickerId}
                    onClick={() => {
                      onSelectSticker(sticker.mediaUrl);
                      onClose();
                    }}
                    className="relative hover:scale-110 transition-transform duration-200 h-[60px] w-[60px]"
                    title={sticker.alt || sticker.stickerId}
                  >
                    <div className="relative w-full h-full bg-[#0f4738] rounded-lg overflow-hidden border border-[#2d7a66] hover:border-[#10b981]">
                      <Image
                        src={sticker.mediaUrl}
                        alt={sticker.alt || sticker.stickerId}
                        fill
                        className="object-cover transition-transform"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-16 text-[#9bc4b6] text-xs">
                {searchQuery ? 'Không tìm thấy' : 'Chọn pack'}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
