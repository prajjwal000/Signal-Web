'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import type { Message } from '@/lib/types';
import { getAttachmentUrl } from '@/lib/api';
import MessageStatus from './MessageStatus';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSender: boolean;
  isLastInGroup: boolean;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export default function MessageBubble({
  message,
  isOwn,
  showSender,
  isLastInGroup,
}: MessageBubbleProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const user = useAuthStore((s) => s.user);
  const { send } = useWebSocketContext();

  const handleReaction = (emoji: string) => {
    send({ type: 'reaction', message_id: message.id, emoji, action: 'add' });
    setShowReactionPicker(false);
  };

  const isImage = message.attachment?.mime_type?.startsWith('image/');

  return (
    <div
      className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${
        showSender && !isOwn ? 'mt-3' : 'mt-[3px]'
      } relative group`}
      onMouseLeave={() => setShowReactionPicker(false)}
    >
      <div
        className={`max-w-[min(306px,calc(100%-38px))] px-3 py-2 ${
          isOwn
            ? 'bg-surface-msg-out text-white'
            : 'bg-surface-msg-in text-label-primary'
        } ${
          isOwn
            ? isLastInGroup
              ? 'rounded-2xl rounded-br-sm'
              : 'rounded-2xl'
            : isLastInGroup
              ? 'rounded-2xl rounded-bl-sm'
              : 'rounded-2xl'
        }`}
      >
        {showSender && !isOwn && (
          <p className="text-xs font-semibold text-brand mb-0.5">
            {message.sender_name || 'Unknown'}
          </p>
        )}

        {message.reply_to_msg && (
          <div className={`mb-1 pl-2 border-l-2 ${
            isOwn ? 'border-white/40' : 'border-brand/40'
          } text-xs opacity-80`}>
            <p className="font-semibold">{message.reply_to_msg.sender_name}</p>
            <p className="truncate">{message.reply_to_msg.content || 'Attachment'}</p>
          </div>
        )}

        {message.attachment && (
          <div className="mb-1">
            {isImage ? (
              <img
                src={getAttachmentUrl(message.attachment.id)}
                alt={message.attachment.filename}
                className="rounded-lg max-w-full max-h-60 object-cover"
                loading="lazy"
              />
            ) : (
              <a
                href={getAttachmentUrl(message.attachment.id)}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 p-2 rounded-lg ${
                  isOwn ? 'bg-white/10 hover:bg-white/20' : 'bg-bg-hover hover:bg-bg-active'
                } transition-colors`}
              >
                <svg className="w-8 h-8 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{message.attachment.filename}</p>
                  <p className="text-[10px] opacity-70">{formatFileSize(message.attachment.size)}</p>
                </div>
              </a>
            )}
          </div>
        )}

        {message.content && (
          <div className="flex items-end gap-1">
            <p className="text-[14px] leading-[21px] break-words whitespace-pre-wrap">{message.content}</p>
            <div className="flex items-center gap-1 flex-shrink-0 self-end pb-0.5 ml-1">
              <span
                className={`text-[11px] ${
                  isOwn ? 'text-white/60' : 'text-label-tertiary'
                }`}
              >
                {formatTime(message.created_at)}
              </span>
              {isOwn && <MessageStatus status={message.status || 'sent'} />}
            </div>
          </div>
        )}

        {!message.content && message.attachment && (
          <div className="flex items-center justify-end gap-1 mt-0.5">
            <span className={`text-[11px] ${isOwn ? 'text-white/60' : 'text-label-tertiary'}`}>
              {formatTime(message.created_at)}
            </span>
            {isOwn && <MessageStatus status={message.status || 'sent'} />}
          </div>
        )}

        {message.expires_at && (
          <div className={`flex items-center gap-1 mt-1 text-[10px] ${isOwn ? 'text-white/50' : 'text-label-tertiary'}`}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Disappearing
          </div>
        )}

        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.reactions.map((r) => {
              const myReaction = r.users.some((u) => u.user_id === user?.id);
              return (
                <button
                  key={r.emoji}
                  onClick={() => handleReaction(r.emoji)}
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs ${
                    myReaction
                      ? 'bg-brand/20 text-brand'
                      : isOwn
                        ? 'bg-white/10 text-white/80 hover:bg-white/20'
                        : 'bg-bg-hover text-label-secondary hover:bg-bg-active'
                  }`}
                >
                  <span>{r.emoji}</span>
                  {r.count > 1 && <span>{r.count}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Reaction trigger */}
      <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 ${
        isOwn ? '-left-8' : '-right-8'
      }`}>
        <button
          onClick={() => setShowReactionPicker(!showReactionPicker)}
          className="p-1 rounded-full bg-bg-tertiary hover:bg-bg-active text-label-secondary shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {showReactionPicker && (
        <div
          className={`absolute -top-12 ${isOwn ? 'right-0' : 'left-0'} z-20 flex items-center gap-0.5 bg-bg-tertiary rounded-full px-2 py-1.5 shadow-lg border border-border`}
        >
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="text-lg hover:scale-125 transition-transform px-0.5"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
