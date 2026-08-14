'use client';

import AppLayout from '@/components/layout/AppLayout';
import AuthGate from '@/components/AuthGate';

export default function Home() {
  return (
    <AuthGate>
      <AppLayout />
    </AuthGate>
  );
}
