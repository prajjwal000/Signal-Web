'use client';

import { useEffect } from 'react';
import { useConversationStore } from '@/stores/conversationStore';
import { useAuthStore } from '@/stores/authStore';
import SidebarHeader from '../sidebar/SidebarHeader';
import ConversationList from '../sidebar/ConversationList';

export default function Sidebar() {
  const loadConversations = useConversationStore((s) => s.loadConversations);
  const loading = useConversationStore((s) => s.loading);
  const logout = useAuthStore((s) => s.logout);

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

      {/* Bottom bar — settings/logout */}
      <div className="flex-shrink-0 border-t border-border px-3 py-2">
        <button
          onClick={logout}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-bg-hover text-label-secondary text-sm transition-colors w-full"
          title="Settings / Logout"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate">Settings</span>
        </button>
      </div>
    </div>
  );
}
