'use client';

import { useState } from 'react';
import { useConversationStore } from '@/stores/conversationStore';
import * as api from '@/lib/api';
import type { Contact } from '@/lib/types';
import Avatar from '@/components/ui/Avatar';

export default function SidebarHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Contact[]>([]);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const selectConversation = useConversationStore((s) => s.selectConversation);
  const addConversation = useConversationStore((s) => s.addConversation);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    try {
      const users = await api.searchUsers(q);
      setResults(users);
    } catch {
      setResults([]);
    }
  };

  const openNewChat = async () => {
    setNewChatOpen(true);
    try {
      const c = await api.getContacts();
      setContacts(c);
    } catch {
      setContacts([]);
    }
  };

  const startDM = async (contactId: number) => {
    try {
      const conv = await api.createConversation({ participant_id: contactId });
      addConversation(conv);
      selectConversation(conv.id);
      setNewChatOpen(false);
      setQuery('');
    } catch {
      // conversation might already exist
    }
  };

  return (
    <div className="flex-shrink-0">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-semibold text-label-primary">Chats</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="p-2 rounded-full hover:bg-bg-hover text-label-secondary transition-colors"
            title="Search"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button
            onClick={openNewChat}
            className="p-2 rounded-full hover:bg-bg-hover text-label-secondary transition-colors"
            title="New chat"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="px-3 pb-3">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-label-tertiary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 bg-bg-tertiary rounded-lg text-sm text-label-primary placeholder:text-label-tertiary outline-none focus:ring-1 focus:ring-brand"
              autoFocus
            />
          </div>
          {results.length > 0 && (
            <div className="mt-2 bg-bg-secondary rounded-lg overflow-hidden">
              {results.map((user) => (
                <button
                  key={user.id}
                  onClick={() => startDM(user.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-bg-hover text-left"
                >
                  <Avatar name={user.display_name} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-label-primary truncate">
                      {user.display_name}
                    </p>
                    <p className="text-xs text-label-secondary">@{user.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Chat Panel */}
      {newChatOpen && (
        <div className="absolute inset-0 z-50 bg-bg-primary flex flex-col">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <button
              onClick={() => { setNewChatOpen(false); setQuery(''); }}
              className="p-1 rounded-full hover:bg-bg-hover text-label-secondary"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-label-primary">New chat</h2>
          </div>

          {/* Search */}
          <div className="px-3 py-3">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-label-tertiary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Name, username, or number"
                className="w-full pl-9 pr-3 py-2 bg-bg-tertiary rounded-lg text-sm text-label-primary placeholder:text-label-tertiary outline-none focus:ring-1 focus:ring-brand"
                autoFocus
              />
            </div>
          </div>

          {/* Results or contacts */}
          <div className="flex-1 overflow-y-auto">
            {query.length >= 2 && results.length > 0 ? (
              <div>
                <p className="px-4 py-2 text-xs font-semibold text-label-secondary uppercase">
                  Search results
                </p>
                {results.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => startDM(user.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-hover text-left"
                  >
                    <Avatar name={user.display_name} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-label-primary truncate">
                        {user.display_name}
                      </p>
                      <p className="text-xs text-label-secondary">@{user.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <p className="px-4 py-2 text-xs font-semibold text-label-secondary uppercase">
                  Contacts
                </p>
                {contacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => startDM(contact.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-hover text-left"
                  >
                    <Avatar name={contact.display_name} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-label-primary truncate">
                        {contact.display_name}
                      </p>
                      <p className="text-xs text-label-secondary">@{contact.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
