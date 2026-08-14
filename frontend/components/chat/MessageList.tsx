'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useMessageStore } from '@/stores/messageStore';
import { useAuthStore } from '@/stores/authStore';
import { useReplyStore } from '@/stores/replyStore';
import type { Message } from '@/lib/types';
import MessageBubble from './MessageBubble';
import DateSeparator from './DateSeparator';
import ScrollToBottom from './ScrollToBottom';
import ContextMenu from '@/components/ui/ContextMenu';

const SCROLL_THRESHOLD = 200;

interface MessageListProps {
  conversationId: number;
}

export default function MessageList({ conversationId }: MessageListProps) {
  const messages = useMessageStore((s) => s.messagesByConv[conversationId] || []);
  const loading = useMessageStore((s) => s.loadingByConv[conversationId]);
  const loadMessages = useMessageStore((s) => s.loadMessages);
  const loadOlderMessages = useMessageStore((s) => s.loadOlderMessages);
  const user = useAuthStore((s) => s.user);
  const setReplyTo = useReplyStore((s) => s.setReplyTo);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const prevLenRef = useRef(0);
  const [fab, setFab] = useState({ show: false, count: 0 });

  // Load messages on conversation change
  useEffect(() => {
    loadMessages(conversationId);
  }, [conversationId, loadMessages]);

  // Track scroll position
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < SCROLL_THRESHOLD;
    isNearBottomRef.current = nearBottom;

    if (el.scrollTop < 50 && !loadingRef.current) {
      loadingRef.current = true;
      loadOlderMessages(conversationId).then(() => {
        loadingRef.current = false;
      });
    }
  }, [conversationId, loadOlderMessages]);

  // Auto-scroll and FAB logic
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const newCount = messages.length - prevLenRef.current;
    prevLenRef.current = messages.length;

    if (newCount > 0) {
      if (isNearBottomRef.current) {
        el.scrollTop = el.scrollHeight;
      } else {
        setFab((prev) => ({ show: true, count: prev.count + newCount }));
      }
    }
  }, [messages.length]);

  // Scroll to bottom on conversation change
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [conversationId]);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      setFab({ show: false, count: 0 });
    }
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentGroup: Message[] = [];
    let currentDate = '';

    for (const msg of messages) {
      const date = new Date(msg.created_at).toLocaleDateString();
      if (date !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, messages: currentGroup });
        }
        currentGroup = [msg];
        currentDate = date;
      } else {
        currentGroup.push(msg);
      }
    }
    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, messages: currentGroup });
    }
    return groups;
  }, [messages]);

  return (
    <div className="flex-1 relative min-h-0">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-auto px-4 py-2"
      >
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-label-secondary text-sm">
            <svg className="w-12 h-12 text-label-tertiary mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>No messages yet. Say hello!</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-0.5">
            {groupedMessages.map((group) => (
              <div key={group.date}>
                <DateSeparator date={group.date} />
                {group.messages.map((msg, i) => {
                  const isOwn = msg.sender_id === user?.id;
                  const showSender = !isOwn && (
                    i === 0 ||
                    group.messages[i - 1].sender_id !== msg.sender_id
                  );
                  const isLastInGroup =
                    i === group.messages.length - 1 ||
                    group.messages[i + 1].sender_id !== msg.sender_id;

                  return (
                    <div key={msg.id} className="group/msg relative animate-message-in">
                      <ContextMenu
                        items={[
                          {
                            label: 'Reply',
                            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>,
                            onClick: () => setReplyTo(msg),
                          },
                          {
                            label: 'Copy',
                            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
                            onClick: () => navigator.clipboard.writeText(msg.content),
                          },
                          ...(isOwn ? [] : [{
                            label: 'React',
                            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
                            onClick: () => {},
                          }]),
                        ]}
                      >
                        <MessageBubble
                          message={msg}
                          isOwn={isOwn}
                          showSender={showSender}
                          isLastInGroup={isLastInGroup}
                        />
                      </ContextMenu>
                      {/* Reply button — appears on hover */}
                      <button
                        onClick={() => setReplyTo(msg)}
                        className="absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/msg:opacity-100 transition-opacity p-1.5 rounded-full bg-bg-tertiary hover:bg-bg-active text-label-secondary z-10 shadow-sm"
                        style={{ [isOwn ? 'left' : 'right']: '-36px' }}
                        title="Reply"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {fab.show && (
        <ScrollToBottom onClick={scrollToBottom} newMessageCount={fab.count} />
      )}
    </div>
  );
}
