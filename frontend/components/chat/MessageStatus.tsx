'use client';

interface MessageStatusProps {
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

export default function MessageStatus({ status }: MessageStatusProps) {
  if (status === 'sending') {
    return (
      <svg className="w-4 h-4 text-white/50 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-25" />
        <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (status === 'sent') {
    return (
      <svg className="w-4 h-4 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }

  // delivered or read
  return (
    <svg
      className={`w-4 h-4 ${status === 'read' ? 'text-blue-300' : 'text-white/70'}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M1 13l4 4L15 7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 13l4 4L21 7" />
    </svg>
  );
}
