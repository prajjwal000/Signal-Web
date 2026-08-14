'use client';

import { ThemeProvider } from '@/contexts/ThemeContext';
import ToastContainer from '@/components/ui/Toast';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <ToastContainer />
    </ThemeProvider>
  );
}
