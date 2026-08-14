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

function GroupAvatar() {
  return (
    <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0">
      <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </div>
  );
}

function ConversationItem({ conv }: { conv: Conversation }) {
  const { selectedConvId, selectConversation } = useConversationStore();
  const user = useAuthStore((s) => s.user);
  const isActive = selectedConvId === conv.id;
  const hasUnread = conv.unread_count > 0;

  const displayName = conv.is_group
    ? conv.name || 'Group'
    : conv.other_user?.display_name || 'Unknown';

  const lastMsg = conv.last_message
    ? (() => {
        if (conv.is_group) {
          if (conv.last_sender === user?.display_name) {
            return `You: ${conv.last_message}`;
          }
          return conv.last_sender
            ? `${conv.last_sender}: ${conv.last_message}`
            : conv.last_message;
        }
        // DM
        if (conv.last_sender === user?.display_name) {
          return `You: ${conv.last_message}`;
        }
        return conv.last_message;
      })()
    : 'No messages yet';

  return (
    <button
      onClick={() => selectConversation(conv.id)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-bg-hover ${
        isActive ? 'bg-bg-hover' : ''
      }`}
    >
      {conv.is_group ? (
        <GroupAvatar />
      ) : (
        <Avatar
          name={displayName}
          src={conv.other_user?.avatar_url}
          size="md"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span
            className={`text-sm truncate ${
              hasUnread ? 'font-bold text-label-primary' : 'font-medium text-label-primary'
            }`}
          >
            {displayName}
          </span>
          <span
            className={`text-xs ml-2 flex-shrink-0 ${
              hasUnread ? 'text-brand font-medium' : 'text-label-tertiary'
            }`}
          >
            {formatTime(conv.updated_at)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p
            className={`text-xs truncate ${
              hasUnread ? 'text-label-primary font-medium' : 'text-label-secondary'
            }`}
          >
            {lastMsg}
          </p>
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
        <div className="flex flex-col items-center justify-center h-full text-label-secondary text-sm px-4">
          <svg className="w-12 h-12 text-label-tertiary mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-label-secondary">No conversations yet</p>
          <p className="text-xs mt-1 text-label-tertiary">Tap the compose button to start chatting</p>
        </div>
      ) : (
        conversations.map((conv) => (
          <ConversationItem key={conv.id} conv={conv} />
        ))
      )}
    </div>
  );
}
