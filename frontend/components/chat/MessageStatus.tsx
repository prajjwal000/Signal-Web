'use client';

interface MessageStatusProps {
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export default function MessageStatus({ status }: MessageStatusProps) {
  if (status === 'sending') {
    return (
      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-25" />
        <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (status === 'failed') {
    return (
      <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (status === 'sent') {
    return (
      <svg className="w-4 h-4" viewBox="0 0 16 11" fill="none">
        <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.659-.003.461.461 0 0 0-.003.66l2.37 2.47c.093.096.213.144.334.144a.458.458 0 0 0 .356-.176l6.545-8.071a.448.448 0 0 0-.057-.646z" fill="currentColor" />
      </svg>
    );
  }

  // delivered or read — double check
  const color = status === 'read' ? '#5ca0f2' : 'currentColor';

  return (
    <svg className="w-4 h-4" viewBox="0 0 16 11" fill="none">
      <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.659-.003.461.461 0 0 0-.003.66l2.37 2.47c.093.096.213.144.334.144a.458.458 0 0 0 .356-.176l6.545-8.071a.448.448 0 0 0-.057-.646z" fill={color} />
      <path d="M15.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.2-1.25-.334.413 1.2 1.25a.458.458 0 0 0 .356.176.458.458 0 0 0 .356-.176l6.545-8.071a.448.448 0 0 0-.048-.654z" fill={color} />
    </svg>
  );
}
