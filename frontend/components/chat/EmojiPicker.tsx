'use client';

import { useRef, useEffect, useState } from 'react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Lazy load emoji-mart to avoid SSR issues
  const [Picker, setPicker] = useState<React.ComponentType<{ onEmojiSelect: (emoji: { native: string }) => void; theme?: string; previewPosition?: string; skinTonePosition?: string }> | null>(null);

  useEffect(() => {
    import('@emoji-mart/react').then((mod) => {
      setPicker(() => mod.default);
    });
  }, []);

  if (!Picker) {
    return (
      <div ref={pickerRef} className="absolute bottom-full left-0 mb-2 bg-bg-tertiary rounded-xl shadow-xl p-4 w-[320px]">
        <div className="flex items-center justify-center h-[200px] text-label-secondary text-sm">
          Loading emojis...
        </div>
      </div>
    );
  }

  return (
    <div ref={pickerRef} className="absolute bottom-full left-0 mb-2 z-50">
      <Picker
        onEmojiSelect={(emoji: { native: string }) => onSelect(emoji.native)}
        theme="dark"
        previewPosition="none"
        skinTonePosition="none"
      />
    </div>
  );
}
