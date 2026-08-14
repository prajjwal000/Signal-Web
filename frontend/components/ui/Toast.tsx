'use client';

import { useToastStore, type ToastType } from '@/hooks/useToast';

const icons: Record<ToastType, string> = {
  success: 'M5 13l4 4L19 7',
  error: 'M6 18L18 6M6 6l12 12',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

const styles: Record<ToastType, string> = {
  success: 'bg-success/90 text-white',
  error: 'bg-danger/90 text-white',
  info: 'bg-bg-tertiary text-label-primary border border-border',
};

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-bottom-2 ${styles[toast.type]}`}
          onClick={() => removeToast(toast.id)}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icons[toast.type]} />
          </svg>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
