'use client';

import { useEffect, useState, useCallback } from 'react';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { useMobileNav } from '@/stores/mobileNavStore';
import { useConversationStore } from '@/stores/conversationStore';
import { useNavStore } from '@/stores/navStore';
import NavTabs from '@/components/nav/NavTabs';
import LeftPane from '@/components/left/LeftPane';
import ChatPane from '@/components/chat/ChatPane';
import SettingsTab from '@/components/settings/SettingsTab';
import ShortcutsModal from '@/components/ui/ShortcutsModal';

export default function AppLayout() {
  const showSidebar = useMobileNav((s) => s.showSidebar);
  const selectedConvId = useConversationStore((s) => s.selectedConvId);
  const activeTab = useNavStore((s) => s.activeTab);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // On mobile: when a conversation is selected, show chat view
  useEffect(() => {
    if (selectedConvId) {
      useMobileNav.getState().showChat();
    }
  }, [selectedConvId]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('signal:new-chat'));
    }
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      setShowShortcuts((s) => !s);
    }
    if (e.key === 'Escape') {
      if (showShortcuts) {
        setShowShortcuts(false);
      } else if (!showSidebar && window.innerWidth < 768) {
        useMobileNav.getState().showSidebarView();
      }
    }
  }, [showShortcuts, showSidebar]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <WebSocketProvider>
      <div className="h-full flex overflow-hidden">
        {/* NavTabs — vertical icon bar (always visible on desktop, hidden on mobile) */}
        <div className="flex-shrink-0 hidden md:flex">
          <NavTabs />
        </div>

        {/* Left Pane — conversation list (full-width on mobile, fixed-width on desktop) */}
        <div
          className={`flex-shrink-0 flex flex-col border-r border-border overflow-hidden ${
            showSidebar ? 'flex' : 'hidden md:flex'
          }`}
          style={{ width: 'var(--sidebar-width)' }}
        >
          {activeTab === 'settings' ? (
            <SettingsTab />
          ) : activeTab === 'calls' || activeTab === 'stories' ? (
            <ComingSoonPlaceholder />
          ) : (
            <LeftPane />
          )}
        </div>

        {/* Chat Pane — full width on mobile when sidebar is hidden, flex-1 on desktop */}
        <div
          className={`flex-1 flex flex-col min-w-0 ${
            showSidebar ? 'hidden md:flex' : 'flex'
          }`}
        >
          <ChatPane />
        </div>
      </div>

      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </WebSocketProvider>
  );
}

function ComingSoonPlaceholder() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-label-secondary text-sm px-4">
      <svg className="w-16 h-16 text-label-tertiary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
      <p className="font-medium">Coming Soon</p>
      <p className="text-xs mt-1 text-label-tertiary">This feature is under development</p>
    </div>
  );
}
