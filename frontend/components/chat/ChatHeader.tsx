'use client';

import { useState } from 'react';
import { useMessageStore } from '@/stores/messageStore';
import { useMobileNav } from '@/stores/mobileNavStore';
import Avatar from '@/components/ui/Avatar';
import GroupInfoPanel from './GroupInfoPanel';
import type { Conversation } from '@/lib/types';

export default function ChatHeader({ conversation }: { conversation: Conversation }) {
  const onlineUsers = useMessageStore((s) => s.onlineUsers);
  const typingUsers = useMessageStore((s) => s.typingUsers[conversation.id]);
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  const displayName = conversation.is_group
    ? conversation.name || 'Group'
    : conversation.other_user?.display_name || 'Unknown';

  const isOnline = !conversation.is_group && conversation.other_user
    ? onlineUsers.has(conversation.other_user.id)
    : false;

  const typingNames = typingUsers && typingUsers.size > 0
    ? `${typingUsers.size} typing...`
    : null;

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-primary min-h-[52px]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => useMobileNav.getState().showSidebarView()}
            className="md:hidden p-1 -ml-1 rounded-full hover:bg-bg-hover text-label-secondary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <Avatar name={displayName} size="md" online={isOnline} />
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-label-primary">{displayName}</h2>
              {conversation.is_group && (
                <button
                  onClick={() => setShowGroupInfo(true)}
                  className="text-label-secondary hover:text-label-primary transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
            {typingNames ? (
              <p className="text-xs text-brand">{typingNames}</p>
            ) : isOnline ? (
              <p className="text-xs text-label-secondary">Online</p>
            ) : conversation.is_group ? (
              <p className="text-xs text-label-secondary">{conversation.member_count || '?'} members</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <button className="p-2 rounded-full hover:bg-bg-hover text-label-secondary transition-colors" title="Video call">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button className="p-2 rounded-full hover:bg-bg-hover text-label-secondary transition-colors" title="Search">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button className="p-2 rounded-full hover:bg-bg-hover text-label-secondary transition-colors" title="More">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>

      {showGroupInfo && (
        <GroupInfoPanel
          conversationId={conversation.id}
          conversationName={displayName}
          onClose={() => setShowGroupInfo(false)}
        />
      )}
    </>
  );
}
