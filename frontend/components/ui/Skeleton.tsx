'use client';

interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-bg-tertiary rounded ${className}`} />
  );
}

export function ConversationListSkeleton() {
  return (
    <div className="p-2 space-y-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessageListSkeleton() {
  return (
    <div className="flex-1 px-4 py-2">
      <div className="max-w-2xl mx-auto space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[70%] space-y-1 ${i % 2 === 0 ? 'items-start' : 'items-end'}`}>
              <Skeleton className="h-4 w-16" />
              <Skeleton className={`h-10 ${i % 2 === 0 ? 'w-48' : 'w-36'} rounded-2xl`} />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatHeaderSkeleton() {
  return (
    <div className="flex-shrink-0 h-14 border-b border-border px-4 flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}
