'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConversationStore } from '@/stores/conversationStore';
import * as api from '@/lib/api';
import type { Contact } from '@/lib/types';
import Avatar from '@/components/ui/Avatar';
import ConversationList from '@/components/conversationList/ConversationList';
import NavSidebar from './NavSidebar';
import { WidthBreakpoint, getWidthBreakpoint, type PanelMode } from './types';

export default function LeftPane() {
  const [panelMode, setPanelMode] = useState<PanelMode>('closed');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Contact[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarWidth] = useState(320);
  const selectConversation = useConversationStore((s) => s.selectConversation);
  const addConversation = useConversationStore((s) => s.addConversation);

  const widthBreakpoint = getWidthBreakpoint(sidebarWidth);

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const users = await api.searchUsers(q);
      setSearchResults(users);
    } catch {
      setSearchResults([]);
    }
  }, []);

  const openNewChat = useCallback(async () => {
    setPanelMode('new-chat');
    setSearchQuery('');
    setSearchResults([]);
    try {
      const c = await api.getContacts();
      setContacts(c);
    } catch {
      setContacts([]);
    }
  }, []);

  const startDM = useCallback(async (contactId: number) => {
    setLoading(true);
    try {
      const conv = await api.createConversation({ participant_id: contactId });
      addConversation(conv);
      selectConversation(conv.id);
      closePanel();
    } catch {
      const convs = useConversationStore.getState().conversations;
      const existing = convs.find((c) => !c.is_group && c.other_user?.id === contactId);
      if (existing) {
        selectConversation(existing.id);
        closePanel();
      }
    } finally {
      setLoading(false);
    }
  }, [addConversation, selectConversation]);

  const toggleMember = useCallback((contact: Contact) => {
    setSelectedMembers((prev) => {
      const exists = prev.find((m) => m.id === contact.id);
      if (exists) return prev.filter((m) => m.id !== contact.id);
      return [...prev, contact];
    });
  }, []);

  const createGroup = useCallback(async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    setLoading(true);
    try {
      const conv = await api.createConversation({
        name: groupName.trim(),
        member_ids: selectedMembers.map((m) => m.id),
      });
      addConversation(conv);
      selectConversation(conv.id);
      closePanel();
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [groupName, selectedMembers, addConversation, selectConversation]);

  const closePanel = useCallback(() => {
    setPanelMode('closed');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedMembers([]);
    setGroupName('');
  }, []);

  const openSearch = useCallback(() => {
    setPanelMode('search');
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  // Listen for Ctrl+K shortcut to open new chat
  useEffect(() => {
    const handler = () => openNewChat();
    window.addEventListener('signal:new-chat', handler);
    return () => window.removeEventListener('signal:new-chat', handler);
  }, [openNewChat]);

  // Render header based on panel mode
  const renderHeader = () => {
    if (panelMode === 'new-chat') {
      return (
        <div className="flex items-center gap-3 flex-1">
          <button onClick={closePanel} className="p-1 rounded-full hover:bg-bg-hover text-label-secondary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-label-primary">New chat</h1>
        </div>
      );
    }
    if (panelMode === 'new-group-select') {
      return (
        <div className="flex items-center gap-3 flex-1">
          <button onClick={() => { setPanelMode('new-chat'); setSelectedMembers([]); }} className="p-1 rounded-full hover:bg-bg-hover text-label-secondary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-label-primary">New group</h1>
          {selectedMembers.length > 0 && (
            <button onClick={() => setPanelMode('new-group-name')} className="ml-auto text-sm font-semibold text-brand">
              Next ({selectedMembers.length})
            </button>
          )}
        </div>
      );
    }
    if (panelMode === 'new-group-name') {
      return (
        <div className="flex items-center gap-3 flex-1">
          <button onClick={() => { setPanelMode('new-group-select'); setGroupName(''); }} className="p-1 rounded-full hover:bg-bg-hover text-label-secondary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-label-primary">Name group</h1>
          <button
            onClick={createGroup}
            disabled={!groupName.trim() || loading}
            className="ml-auto text-sm font-semibold text-brand disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      );
    }
    if (panelMode === 'search') {
      return (
        <div className="flex items-center gap-3 flex-1">
          <button onClick={closePanel} className="p-1 rounded-full hover:bg-bg-hover text-label-secondary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-label-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search"
              className="w-full pl-9 pr-3 py-1.5 bg-bg-tertiary rounded-lg text-sm text-label-primary placeholder:text-label-tertiary outline-none"
              autoFocus
            />
          </div>
        </div>
      );
    }
    // Default header
    return (
      <>
        <h1 className="text-lg font-bold text-label-primary">Chats</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={openSearch}
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
      </>
    );
  };

  // Render content based on panel mode
  const renderContent = () => {
    if (panelMode === 'new-chat') {
      return (
        <>
          {/* Search */}
          <div className="px-3 py-2">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-label-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Name, username, or number"
                className="w-full pl-9 pr-3 py-2 bg-bg-tertiary rounded-lg text-sm text-label-primary placeholder:text-label-tertiary outline-none"
                autoFocus
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* New group option */}
            <button
              onClick={() => { setPanelMode('new-group-select'); setSearchQuery(''); setSearchResults([]); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-hover text-left"
            >
              <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-label-primary">New group</span>
            </button>
            {/* Search results */}
            {searchQuery.length >= 2 && searchResults.length > 0 && (
              <div>
                <p className="px-4 py-2 text-xs font-semibold text-label-secondary uppercase tracking-wide">Search results</p>
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => startDM(user.id)}
                    disabled={loading}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-hover text-left disabled:opacity-50"
                  >
                    <Avatar name={user.display_name} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-label-primary truncate">{user.display_name}</p>
                      <p className="text-xs text-label-secondary">@{user.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {/* Contacts list */}
            {searchQuery.length < 2 && (
              <div>
                <p className="px-4 py-2 text-xs font-semibold text-label-secondary uppercase tracking-wide">Contacts</p>
                {contacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => startDM(contact.id)}
                    disabled={loading}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-hover text-left disabled:opacity-50"
                  >
                    <Avatar name={contact.display_name} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-label-primary truncate">{contact.display_name}</p>
                      <p className="text-xs text-label-secondary">@{contact.username}</p>
                    </div>
                  </button>
                ))}
                {contacts.length === 0 && (
                  <p className="px-4 py-6 text-sm text-label-secondary text-center">No contacts yet</p>
                )}
              </div>
            )}
          </div>
        </>
      );
    }

    if (panelMode === 'new-group-select') {
      return (
        <>
          <div className="px-3 py-2">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-label-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search for people"
                className="w-full pl-9 pr-3 py-2 bg-bg-tertiary rounded-lg text-sm text-label-primary placeholder:text-label-tertiary outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {selectedMembers.length > 0 && (
              <div className="px-4 py-2 flex flex-wrap gap-2">
                {selectedMembers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => toggleMember(m)}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-brand/20 text-brand rounded-full text-xs font-medium hover:bg-brand/30"
                  >
                    {m.display_name}
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
            {searchQuery.length >= 2 && searchResults.length > 0 ? (
              <div>
                <p className="px-4 py-2 text-xs font-semibold text-label-secondary uppercase tracking-wide">Search results</p>
                {searchResults.map((user) => {
                  const selected = selectedMembers.some((m) => m.id === user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={() => toggleMember(user)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-hover text-left"
                    >
                      <Avatar name={user.display_name} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-label-primary truncate">{user.display_name}</p>
                        <p className="text-xs text-label-secondary">@{user.username}</p>
                      </div>
                      {selected && (
                        <svg className="w-5 h-5 text-brand flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : searchQuery.length < 2 ? (
              <div>
                <p className="px-4 py-2 text-xs font-semibold text-label-secondary uppercase tracking-wide">Contacts</p>
                {contacts.map((contact) => {
                  const selected = selectedMembers.some((m) => m.id === contact.id);
                  return (
                    <button
                      key={contact.id}
                      onClick={() => toggleMember(contact)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-hover text-left"
                    >
                      <Avatar name={contact.display_name} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-label-primary truncate">{contact.display_name}</p>
                        <p className="text-xs text-label-secondary">@{contact.username}</p>
                      </div>
                      {selected && (
                        <svg className="w-5 h-5 text-brand flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </>
      );
    }

    if (panelMode === 'new-group-name') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
          <div className="w-16 h-16 rounded-full bg-brand/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name"
            className="w-full px-4 py-2.5 bg-bg-tertiary rounded-lg text-sm text-label-primary placeholder:text-label-tertiary outline-none text-center"
            autoFocus
          />
          <p className="text-xs text-label-secondary">
            {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      );
    }

    if (panelMode === 'search') {
      return (
        <>
          <div className="flex-1 overflow-y-auto">
            {searchQuery.length >= 2 && searchResults.length > 0 ? (
              <div>
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => startDM(user.id)}
                    disabled={loading}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-hover text-left disabled:opacity-50"
                  >
                    <Avatar name={user.display_name} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-label-primary truncate">{user.display_name}</p>
                      <p className="text-xs text-label-secondary">@{user.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : searchQuery.length >= 2 ? (
              <div className="flex flex-col items-center justify-center h-64 text-label-secondary text-sm">
                <p>No results found</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-label-secondary text-sm">
                <svg className="w-12 h-12 text-label-tertiary mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>Search for people by name, username, or phone number</p>
              </div>
            )}
          </div>
        </>
      );
    }

    // Default: conversation list
    return <ConversationList />;
  };

  return (
    <NavSidebar
      title="Chats"
      actions={
        panelMode === 'closed' ? (
          <>
            <button
              onClick={openSearch}
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
          </>
        ) : undefined
      }
      headerContent={panelMode !== 'closed' ? renderHeader() : undefined}
      widthBreakpoint={widthBreakpoint}
    >
      {renderContent()}
    </NavSidebar>
  );
}
