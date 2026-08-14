'use client';

interface ScrollToBottomProps {
  onClick: () => void;
  newMessageCount?: number;
}

export default function ScrollToBottom({ onClick, newMessageCount = 0 }: ScrollToBottomProps) {
  return (
    <button
      onClick={onClick}
      className="absolute bottom-4 right-4 z-10 w-10 h-10 rounded-full bg-bg-tertiary hover:bg-bg-active border border-border shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
      title="Scroll to bottom"
    >
      <svg className="w-5 h-5 text-label-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
      {newMessageCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center px-1">
          {newMessageCount > 99 ? '99+' : newMessageCount}
        </span>
      )}
    </button>
  );
}
