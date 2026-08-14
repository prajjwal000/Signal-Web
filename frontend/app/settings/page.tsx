'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';

const sections = [
  {
    title: 'Account',
    items: [
      { label: 'Profile', icon: 'user', description: 'Edit your display name and avatar' },
      { label: 'Phone Number', icon: 'phone', description: 'Manage your phone number' },
      { label: 'Change Number', icon: 'device', description: 'Change your registered number' },
    ],
  },
  {
    title: 'Privacy',
    items: [
      { label: 'Blocked Users', icon: 'block', description: 'Manage blocked contacts' },
      { label: 'Read Receipts', icon: 'check', description: 'Control who sees read receipts' },
      { label: 'Typing Indicators', icon: 'keyboard', description: 'Show when you\'re typing' },
    ],
  },
  {
    title: 'Notifications',
    items: [
      { label: 'Messages', icon: 'bell', description: 'Notification settings for messages' },
      { label: 'Groups', icon: 'group', description: 'Notification settings for groups' },
    ],
  },
  {
    title: 'Appearance',
    items: [
      { label: 'Theme', icon: 'theme', description: 'Dark or light mode' },
      { label: 'Chat Wallpaper', icon: 'image', description: 'Customize chat background' },
    ],
  },
  {
    title: 'Linked Devices',
    items: [
      { label: 'Manage Devices', icon: 'link', description: 'View and manage linked devices' },
    ],
  },
  {
    title: 'Help',
    items: [
      { label: 'About', icon: 'info', description: 'App version and legal information' },
      { label: 'FAQ', icon: 'help', description: 'Frequently asked questions' },
    ],
  },
];

function SectionIcon({ icon }: { icon: string }) {
  const icons: Record<string, React.ReactNode> = {
    user: <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
    phone: <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />,
    device: <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />,
    block: <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />,
    check: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
    keyboard: <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />,
    bell: <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
    group: <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
    theme: <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />,
    image: <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    link: <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />,
    info: <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    help: <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  };

  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      {icons[icon] || icons.info}
    </svg>
  );
}

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg-primary border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-full hover:bg-bg-hover text-label-secondary">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-label-primary">Settings</h1>
      </div>

      <div className="max-w-lg mx-auto py-4">
        {/* Profile header */}
        <div className="px-4 py-4 flex items-center gap-4 border-b border-border">
          <div className="w-16 h-16 rounded-full bg-brand/20 flex items-center justify-center text-brand text-xl font-bold">
            {user?.display_name?.charAt(0) || '?'}
          </div>
          <div>
            <p className="text-base font-semibold text-label-primary">{user?.display_name}</p>
            <p className="text-sm text-label-secondary">@{user?.username}</p>
          </div>
        </div>

        {/* Sections */}
        {sections.map((section) => (
          <div key={section.title} className="border-b border-border">
            <p className="px-4 py-2 text-xs font-semibold text-brand uppercase">{section.title}</p>
            {section.items.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  if (item.label === 'Theme') toggleTheme();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-hover text-left transition-colors"
              >
                <div className="text-label-secondary">
                  <SectionIcon icon={item.icon} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-label-primary">{item.label}</p>
                  <p className="text-xs text-label-secondary">{item.description}</p>
                </div>
                {item.label === 'Theme' && (
                  <span className="text-xs text-label-tertiary">{theme === 'dark' ? 'Dark' : 'Light'}</span>
                )}
                {item.label !== 'Theme' && (
                  <svg className="w-4 h-4 text-label-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        ))}

        {/* Logout */}
        <div className="px-4 py-4">
          <button
            onClick={() => { logout(); router.replace('/'); }}
            className="w-full py-2.5 bg-danger/10 hover:bg-danger/20 text-danger font-medium rounded-lg transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
