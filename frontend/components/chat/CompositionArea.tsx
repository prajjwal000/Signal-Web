'use client';

import { useState, useRef, useCallback } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuthStore } from '@/stores/authStore';
import { useMessageStore } from '@/stores/messageStore';

interface CompositionAreaProps {
  conversationId: number;
}

export default function CompositionArea({ conversationId }: CompositionAreaProps) {
  const [text, setText] = useState('');
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const isTyping = useRef(false);
  const token = useAuthStore((s) => s.token);
  const optimisticallySendMessage = useMessageStore((s) => s.optimisticallySendMessage);
  const { send } = useWebSocket(token);

  const sendTyping = useCallback(
    (typing: boolean) => {
      send({ type: 'typing', conversation_id: conversationId, is_typing: typing });
    },
    [send, conversationId]
  );

  const handleInput = (value: string) => {
    setText(value);

    // Typing indicator
    if (!isTyping.current && value.length > 0) {
      isTyping.current = true;
      sendTyping(true);
    }

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      isTyping.current = false;
      sendTyping(false);
    }, 3000);
  };

  const handleSend = () => {
    const content = text.trim();
    if (!content) return;

    // Optimistic add
    optimisticallySendMessage(conversationId, content);

    // Send via WS
    send({ type: 'message', conversation_id: conversationId, content });

    setText('');
    isTyping.current = false;
    sendTyping(false);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-shrink-0 border-t border-border bg-bg-primary px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-end gap-2">
        {/* Emoji button (placeholder) */}
        <button className="p-2 rounded-full hover:bg-bg-hover text-label-secondary transition-colors flex-shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            value={text}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message"
            rows={1}
            className="w-full px-4 py-2.5 bg-bg-tertiary rounded-2xl text-sm text-label-primary placeholder:text-label-tertiary outline-none resize-none overflow-hidden max-h-32 focus:ring-1 focus:ring-brand"
            style={{ minHeight: '40px' }}
          />
        </div>

        {/* Mic button (placeholder) */}
        <button className="p-2 rounded-full hover:bg-bg-hover text-label-secondary transition-colors flex-shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>

        {/* Plus button (placeholder for attachments) */}
        <button className="p-2 rounded-full hover:bg-bg-hover text-label-secondary transition-colors flex-shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
