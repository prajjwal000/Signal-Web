'use client';

import { useEffect } from 'react';
import { useConversationStore } from '@/stores/conversationStore';
import SidebarHeader from '../sidebar/SidebarHeader';
import ConversationList from '../sidebar/ConversationList';

export default function Sidebar() {
  const loadConversations = useConversationStore((s) => s.loadConversations);
  const loading = useConversationStore((s) => s.loading);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      <SidebarHeader />
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <ConversationList />
      )}
    </div>
  );
}
