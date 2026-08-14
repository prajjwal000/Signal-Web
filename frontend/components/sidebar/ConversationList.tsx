'use client';

import { useConversationStore } from '@/stores/conversationStore';
import { useAuthStore } from '@/stores/authStore';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import type { Conversation } from '@/lib/types';

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function ConversationItem({ conv }: { conv: Conversation }) {
  const { selectedConvId, selectConversation } = useConversationStore();
  const user = useAuthStore((s) => s.user);
  const isActive = selectedConvId === conv.id;

  const displayName = conv.is_group
    ? conv.name || 'Group'
    : conv.other_user?.display_name || 'Unknown';

  const lastMsg = conv.last_message
    ? conv.last_sender && !conv.is_group && conv.last_sender !== user?.display_name
      ? `${conv.last_sender}: ${conv.last_message}`
      : conv.is_group && conv.last_sender
        ? `${conv.last_sender}: ${conv.last_message}`
        : conv.last_message
    : 'No messages yet';

  return (
    <button
      onClick={() => selectConversation(conv.id)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-bg-hover ${
        isActive ? 'bg-bg-hover' : ''
      }`}
    >
      <Avatar name={displayName} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm text-label-primary truncate">
            {displayName}
          </span>
          <span className="text-xs text-label-tertiary ml-2 flex-shrink-0">
            {formatTime(conv.updated_at)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs text-label-secondary truncate">{lastMsg}</p>
          <div className="ml-2 flex-shrink-0">
            <Badge count={conv.unread_count} />
          </div>
        </div>
      </div>
    </button>
  );
}

export default function ConversationList() {
  const conversations = useConversationStore((s) => s.conversations);

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-label-secondary text-sm">
          <p>No conversations yet</p>
          <p className="text-xs mt-1">Start a new chat</p>
        </div>
      ) : (
        conversations.map((conv) => (
          <ConversationItem key={conv.id} conv={conv} />
        ))
      )}
    </div>
  );
}
