'use client';

import { useConversationStore } from '@/stores/conversationStore';
import MessageList from './MessageList';
import CompositionArea from './CompositionArea';
import ChatHeader from './ChatHeader';

export default function ChatPane() {
  const selectedConvId = useConversationStore((s) => s.selectedConvId);
  const conversations = useConversationStore((s) => s.conversations);
  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  if (!selectedConvId || !selectedConv) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-bg-secondary text-label-secondary">
        <div className="w-20 h-20 rounded-full border-2 border-dashed border-label-tertiary flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-label-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-label-primary mb-1">Welcome to Signal</h2>
        <p className="text-sm">Select a conversation to start messaging</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-bg-secondary">
      <ChatHeader conversation={selectedConv} />
      <MessageList conversationId={selectedConvId} />
      <CompositionArea conversationId={selectedConvId} />
    </div>
  );
}
