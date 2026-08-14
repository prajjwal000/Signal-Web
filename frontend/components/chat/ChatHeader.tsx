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
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg-primary">
        <div className="flex items-center gap-2">
          {/* Back button — mobile only */}
          <button
            onClick={() => useMobileNav.getState().showSidebarView()}
            className="md:hidden p-1.5 -ml-1 rounded-full hover:bg-bg-hover text-label-secondary transition-colors"
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
                <svg className="w-4 h-4 text-label-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
            {typingNames ? (
              <p className="text-xs text-brand">{typingNames}</p>
            ) : conversation.is_group ? (
              <p className="text-xs text-label-secondary">
                {conversation.member_count || '?'} members
              </p>
            ) : (
              <p className="text-xs text-label-secondary">
                {isOnline ? 'Online' : 'Offline'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Video call */}
          <button className="p-2 rounded-full hover:bg-bg-hover text-label-secondary transition-colors" title="Video call">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          {/* Phone call */}
          <button className="p-2 rounded-full hover:bg-bg-hover text-label-secondary transition-colors" title="Voice call">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
          {/* Group info */}
          {conversation.is_group && (
            <button
              onClick={() => setShowGroupInfo(true)}
              className="p-2 rounded-full hover:bg-bg-hover text-label-secondary transition-colors"
              title="Group info"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
          {/* More options */}
          <button className="p-2 rounded-full hover:bg-bg-hover text-label-secondary transition-colors" title="More">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
