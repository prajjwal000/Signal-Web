'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export default function AuthPage() {
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, login } = useAuthStore();
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(username, displayName, phone || undefined);
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, otp);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-brand mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-label-primary">
            {step === 'register' ? 'Create Account' : 'Verify OTP'}
          </h1>
          <p className="text-sm text-label-secondary mt-1">
            {step === 'register'
              ? 'Enter your details to get started'
              : `Enter the OTP sent to ${username}`}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
            {error}
          </div>
        )}

        {step === 'register' ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-label-secondary mb-1.5">
                Username *
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-bg-tertiary rounded-lg text-sm text-label-primary placeholder:text-label-tertiary outline-none focus:ring-1 focus:ring-brand"
                placeholder="Choose a username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-label-secondary mb-1.5">
                Display Name *
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-bg-tertiary rounded-lg text-sm text-label-primary placeholder:text-label-tertiary outline-none focus:ring-1 focus:ring-brand"
                placeholder="Your display name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-label-secondary mb-1.5">
                Phone (optional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 bg-bg-tertiary rounded-lg text-sm text-label-primary placeholder:text-label-tertiary outline-none focus:ring-1 focus:ring-brand"
                placeholder="+1 234 567 890"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-label-secondary mb-1.5">
                OTP Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-bg-tertiary rounded-lg text-sm text-label-primary placeholder:text-label-tertiary outline-none focus:ring-1 focus:ring-brand text-center text-2xl tracking-[0.5em]"
                placeholder="0000"
                maxLength={4}
                autoFocus
              />
              <p className="text-xs text-label-tertiary mt-2 text-center">
                Hint: Use <code className="bg-bg-tertiary px-1 rounded">0000</code>
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('register'); setOtp(''); setError(''); }}
              className="w-full py-2.5 text-label-secondary hover:text-label-primary text-sm transition-colors"
            >
              Back to registration
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
