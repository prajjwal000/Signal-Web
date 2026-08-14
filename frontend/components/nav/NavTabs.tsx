'use client';

import type { JSX } from 'react';
import { useNavStore, type NavTab } from '@/stores/navStore';
import { useConversationStore } from '@/stores/conversationStore';

const topTabs: { id: NavTab; label: string; icon: (active: boolean) => JSX.Element }[] = [
  {
    id: 'chats',
    label: 'Chats',
    icon: (active) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'calls',
    label: 'Calls',
    icon: (active) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
        <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'stories',
    label: 'Stories',
    icon: (active) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const bottomTabs: { id: NavTab; label: string; icon: (active: boolean) => JSX.Element }[] = [
  {
    id: 'settings',
    label: 'Settings',
    icon: (active) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
        <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function NavTabs() {
  const activeTab = useNavStore((s) => s.activeTab);
  const setActiveTab = useNavStore((s) => s.setActiveTab);
  const collapsed = useNavStore((s) => s.navCollapsed);
  const toggleCollapsed = useNavStore((s) => s.toggleNavCollapsed);
  const conversations = useConversationStore((s) => s.conversations);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  if (collapsed) {
    return null;
  }

  return (
    <nav className="flex flex-col items-center w-[72px] flex-shrink-0 bg-bg-primary border-r border-border py-2">
      <button
        onClick={toggleCollapsed}
        className="flex items-center justify-center w-12 h-10 rounded-xl mb-2 text-label-secondary hover:text-label-primary hover:bg-bg-hover transition-colors"
        title="Collapse"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="flex flex-col items-center flex-1">
        {topTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center w-12 h-12 rounded-xl mb-1 transition-colors ${
                isActive
                  ? 'text-brand bg-brand/10'
                  : 'text-label-secondary hover:text-label-primary hover:bg-bg-hover'
              }`}
              title={tab.label}
            >
              {tab.icon(isActive)}
              {tab.id === 'chats' && totalUnread > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col items-center">
        {bottomTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center w-12 h-12 rounded-xl mb-1 transition-colors ${
                isActive
                  ? 'text-brand bg-brand/10'
                  : 'text-label-secondary hover:text-label-primary hover:bg-bg-hover'
              }`}
              title={tab.label}
            >
              {tab.icon(isActive)}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
