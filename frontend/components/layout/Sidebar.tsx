'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useConversationStore } from '@/stores/conversationStore';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/contexts/ThemeContext';
import SidebarHeader from '../sidebar/SidebarHeader';
import ConversationList from '../sidebar/ConversationList';
import { ConversationListSkeleton } from '@/components/ui/Skeleton';

export default function Sidebar() {
  const loadConversations = useConversationStore((s) => s.loadConversations);
  const loading = useConversationStore((s) => s.loading);
  const logout = useAuthStore((s) => s.logout);
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      <SidebarHeader />
      {loading ? (
        <ConversationListSkeleton />
      ) : (
        <ConversationList />
      )}

      {/* Bottom bar — settings/logout */}
      <div className="flex-shrink-0 border-t border-border px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-bg-hover text-label-secondary text-sm transition-colors flex-1"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
            <span className="truncate">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>

          <button
            onClick={() => router.push('/settings')}
            className="p-2 rounded-md hover:bg-bg-hover text-label-secondary transition-colors"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          <button
            onClick={logout}
            className="p-2 rounded-md hover:bg-bg-hover text-label-secondary transition-colors"
            title="Logout"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
