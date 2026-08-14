'use client';

import { useConversationStore } from '@/stores/conversationStore';
import { useAuthStore } from '@/stores/authStore';
import { useMessageStore } from '@/stores/messageStore';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import ContextMenu from '@/components/ui/ContextMenu';
import { ConversationListSkeleton } from '@/components/ui/Skeleton';
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
  const selectedConvId = useConversationStore((s) => s.selectedConvId);
  const selectConversation = useConversationStore((s) => s.selectConversation);
  const user = useAuthStore((s) => s.user);
  const typingUsers = useMessageStore((s) => s.typingUsers[conv.id]);
  const isActive = selectedConvId === conv.id;
  const hasUnread = conv.unread_count > 0;

  const displayName = conv.is_group
    ? conv.name || 'Group'
    : conv.other_user?.display_name || 'Unknown';

  const isTyping = typingUsers && typingUsers.size > 0;

  const lastMsg = (() => {
    if (isTyping) return null;
    if (!conv.last_message) return 'No messages yet';
    if (conv.is_group) {
      if (conv.last_sender === user?.display_name) {
        return `You: ${conv.last_message}`;
      }
      return conv.last_sender
        ? `${conv.last_sender}: ${conv.last_message}`
        : conv.last_message;
    }
    if (conv.last_sender === user?.display_name) {
      return `You: ${conv.last_message}`;
    }
    return conv.last_message;
  })();

  return (
    <ContextMenu
      items={[
        {
          label: 'Mark as unread',
          icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
          onClick: () => useConversationStore.getState().incrementUnread(conv.id),
        },
        {
          label: 'Delete',
          icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
          onClick: () => {},
          danger: true,
        },
      ]}
    >
      <button
        onClick={() => selectConversation(conv.id)}
        className="w-full flex items-center rounded-[10px] my-[2px] mx-0 px-[14px] py-2 text-left transition-colors"
        style={{
          height: '72px',
          background: isActive ? 'var(--color-bg-active)' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.background = 'var(--color-bg-hover)';
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = 'transparent';
        }}
      >
        {/* Avatar */}
        {conv.is_group ? (
          <div className="w-[48px] h-[48px] rounded-full bg-bg-tertiary flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-label-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        ) : (
          <Avatar
            name={displayName}
            src={conv.other_user?.avatar_url}
            size="lg"
          />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 ml-3 flex flex-col justify-center overflow-hidden">
          <div className="flex items-center">
            <span
              className={`flex-1 min-w-0 truncate text-[15px] ${
                hasUnread ? 'font-bold' : 'font-medium'
              }`}
            >
              {displayName}
            </span>
            <span
              className={`text-xs ml-2 flex-shrink-0 ${
                hasUnread ? 'text-brand font-medium' : 'text-label-secondary'
              }`}
            >
              {conv.updated_at ? formatTime(conv.updated_at) : ''}
            </span>
          </div>
          <div className="flex items-center mt-0.5">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              {!isTyping && conv.last_message && conv.last_sender === user?.display_name && (
                <svg className="w-4 h-4 flex-shrink-0 text-label-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {isTyping ? (
                <p className="text-xs text-brand font-medium truncate">typing...</p>
              ) : (
                <p
                  className={`text-[13px] leading-[18px] truncate ${
                    hasUnread ? 'font-medium' : ''
                  }`}
                  style={{ color: 'var(--color-label-secondary)' }}
                >
                  {lastMsg}
                </p>
              )}
            </div>
            <div className="ml-2 flex-shrink-0">
              <Badge count={conv.unread_count} />
            </div>
          </div>
        </div>
      </button>
    </ContextMenu>
  );
}

export default function ConversationList() {
  const conversations = useConversationStore((s) => s.conversations);
  const loading = useConversationStore((s) => s.loading);

  return (
    <div className="flex-1 overflow-y-auto">
      {loading && conversations.length === 0 ? (
        <ConversationListSkeleton />
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-label-secondary text-sm px-4">
          <svg className="w-16 h-16 text-label-tertiary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-label-secondary font-medium">No conversations yet</p>
          <p className="text-xs mt-1 text-label-tertiary">Tap the compose button to start chatting</p>
        </div>
      ) : (
        <div className="px-1">
          {conversations.map((conv) => (
            <ConversationItem key={conv.id} conv={conv} />
          ))}
        </div>
      )}
    </div>
  );
}
