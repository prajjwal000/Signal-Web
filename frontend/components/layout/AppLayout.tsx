'use client';

import { WebSocketProvider } from '@/contexts/WebSocketContext';
import Sidebar from './Sidebar';
import ChatPane from '@/components/chat/ChatPane';

export default function AppLayout() {
  return (
    <WebSocketProvider>
      <div className="h-full flex overflow-hidden">
        {/* Sidebar */}
        <div
          className="flex-shrink-0 flex flex-col border-r border-border overflow-hidden"
          style={{ width: 'var(--sidebar-width)' }}
        >
          <Sidebar />
        </div>

        {/* Chat Pane */}
        <div className="flex-1 flex flex-col min-w-0">
          <ChatPane />
        </div>
      </div>
    </WebSocketProvider>
  );
}
