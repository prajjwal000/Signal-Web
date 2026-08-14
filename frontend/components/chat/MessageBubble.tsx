'use client';

import type { Message } from '@/lib/types';
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

export default function MessageBubble({
  message,
  isOwn,
  showSender,
  isLastInGroup,
}: MessageBubbleProps) {
  // Border radius logic: group consecutive messages
  const radiusClass = isOwn
    ? isLastInGroup
      ? 'rounded-2xl rounded-br-md'
      : 'rounded-2xl rounded-r-md'
    : isLastInGroup
      ? 'rounded-2xl rounded-bl-md'
      : 'rounded-2xl rounded-l-md';

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${
        showSender && !isOwn ? 'mt-2' : 'mt-0.5'
      }`}
    >
      <div
        className={`max-w-[70%] px-3 py-2 ${
          isOwn
            ? 'bg-surface-msg-out text-white'
            : 'bg-surface-msg-in text-label-primary'
        } ${radiusClass}`}
      >
        {showSender && !isOwn && (
          <p className="text-xs font-semibold text-brand mb-0.5">
            {message.sender_name || 'Unknown'}
          </p>
        )}
        <div className="flex items-end gap-2">
          <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
          <div className="flex items-center gap-1 flex-shrink-0 self-end pb-0.5">
            <span
              className={`text-[10px] ${
                isOwn ? 'text-white/70' : 'text-label-tertiary'
              }`}
            >
              {formatTime(message.created_at)}
            </span>
            {isOwn && <MessageStatus status={message.status || 'sent'} />}
          </div>
        </div>
      </div>
    </div>
  );
}
