'use client';

import { useState, useRef, useCallback } from 'react';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { useMessageStore } from '@/stores/messageStore';
import { useReplyStore } from '@/stores/replyStore';
import { uploadAttachment } from '@/lib/api';
import EmojiPicker from './EmojiPicker';

interface CompositionAreaProps {
  conversationId: number;
}

export default function CompositionArea({ conversationId }: CompositionAreaProps) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [expiresIn, setExpiresIn] = useState<number>(0);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isTyping = useRef(false);
  const { send, connected } = useWebSocketContext();
  const optimisticallySendMessage = useMessageStore((s) => s.optimisticallySendMessage);
  const markMessageFailed = useMessageStore((s) => s.markMessageFailed);
  const replyTo = useReplyStore((s) => s.replyTo);
  const setReplyTo = useReplyStore((s) => s.setReplyTo);

  const sendTyping = useCallback(
    (typing: boolean) => {
      send({ type: 'typing', conversation_id: conversationId, is_typing: typing });
    },
    [send, conversationId]
  );

  const handleInput = (value: string) => {
    setText(value);
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

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = text.slice(0, start) + emoji + text.slice(end);
      setText(newText);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    } else {
      setText((t) => t + emoji);
    }
    setShowEmoji(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
    }
    e.target.value = '';
  };

  const handleSend = async () => {
    const content = text.trim();
    if (!content && !pendingFile) return;

    let attachmentId: number | undefined;

    if (pendingFile) {
      setUploading(true);
      try {
        const att = await uploadAttachment(pendingFile);
        attachmentId = att.id;
      } catch {
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const tempId = optimisticallySendMessage(conversationId, content, replyTo?.id, attachmentId, expiresIn || undefined);

    const sent = send({
      type: 'message',
      conversation_id: conversationId,
      content,
      reply_to: replyTo?.id,
      attachment_id: attachmentId,
      expires_in: expiresIn || undefined,
    });

    if (!sent) {
      markMessageFailed(conversationId, tempId);
    }

    setText('');
    setPendingFile(null);
    setReplyTo(null);
    setExpiresIn(0);
    isTyping.current = false;
    sendTyping(false);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setReplyTo(null);
    }
  };

  const timerOptions = [
    { label: 'Off', value: 0 },
    { label: '5 seconds', value: 5 },
    { label: '30 seconds', value: 30 },
    { label: '1 minute', value: 60 },
    { label: '5 minutes', value: 300 },
  ];

  const hasContent = text.trim().length > 0 || pendingFile;

  return (
    <div className="flex-shrink-0 bg-bg-primary border-t border-border">
      {/* Reply-to preview */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 pt-2 pb-0">
          <div className="flex-1 min-w-0 px-3 py-2 bg-bg-tertiary rounded-lg border-l-2 border-brand">
            <p className="text-xs font-semibold text-brand">{replyTo.sender_name}</p>
            <p className="text-xs text-label-secondary truncate">{replyTo.content || 'Attachment'}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-label-tertiary hover:text-label-secondary p-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Pending file preview */}
      {pendingFile && (
        <div className="flex items-center gap-2 px-4 pt-2 pb-0">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-bg-tertiary rounded-lg">
            <svg className="w-5 h-5 text-brand flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <span className="text-xs text-label-primary truncate flex-1">{pendingFile.name}</span>
            <button onClick={() => setPendingFile(null)} className="text-label-tertiary hover:text-label-secondary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-1 px-3 py-2 relative">
        {/* Emoji picker */}
        {showEmoji && (
          <EmojiPicker
            onSelect={handleEmojiSelect}
            onClose={() => setShowEmoji(false)}
          />
        )}

        {/* Timer menu */}
        {showTimerMenu && (
          <div className="absolute bottom-full left-0 mb-2 bg-bg-tertiary rounded-xl shadow-xl border border-border overflow-hidden z-50">
            {timerOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setExpiresIn(opt.value); setShowTimerMenu(false); }}
                className={`block w-full text-left px-4 py-2 text-sm hover:bg-bg-hover ${
                  expiresIn === opt.value ? 'text-brand font-medium' : 'text-label-primary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Plus / attachment button */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.txt,.zip"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-2 rounded-full hover:bg-bg-hover text-label-secondary transition-colors flex-shrink-0"
          title="Attach file"
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          )}
        </button>

        {/* Emoji button */}
        <button
          onClick={() => setShowEmoji(!showEmoji)}
          className="p-2 rounded-full hover:bg-bg-hover text-label-secondary transition-colors flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message"
            rows={1}
            className="w-full px-4 py-2 bg-bg-tertiary rounded-2xl text-sm text-label-primary placeholder:text-label-tertiary outline-none resize-none overflow-hidden max-h-32 focus:ring-1 focus:ring-brand/50"
            style={{ minHeight: '40px' }}
          />
        </div>

        {/* Timer button */}
        <button
          onClick={() => setShowTimerMenu(!showTimerMenu)}
          className={`p-2 rounded-full hover:bg-bg-hover transition-colors flex-shrink-0 ${
            expiresIn > 0 ? 'text-brand' : 'text-label-secondary'
          }`}
          title="Disappearing messages"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* Send / voice button */}
        {hasContent ? (
          <button
            onClick={handleSend}
            disabled={uploading}
            className="p-2 rounded-full bg-brand hover:bg-brand-hover text-white transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        ) : (
          <button
            className="p-2 rounded-full hover:bg-bg-hover text-label-secondary transition-colors flex-shrink-0"
            title="Voice message"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
