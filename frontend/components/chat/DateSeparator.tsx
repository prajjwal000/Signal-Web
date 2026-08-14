'use client';

export default function DateSeparator({ date }: { date: string }) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  let label: string;
  if (d.toDateString() === today.toDateString()) {
    label = 'Today';
  } else if (d.toDateString() === yesterday.toDateString()) {
    label = 'Yesterday';
  } else {
    label = d.toLocaleDateString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  return (
    <div className="flex items-center justify-center py-3">
      <span className="px-3 py-1 bg-bg-tertiary/80 rounded-full text-xs text-label-secondary font-medium">
        {label}
      </span>
    </div>
  );
}
