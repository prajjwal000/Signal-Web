'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/useToast';

type Mode = 'choose' | 'login' | 'register' | 'login-otp' | 'register-otp';

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('choose');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, verifyNew, login } = useAuthStore();
  const router = useRouter();
  const toast = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(username, displayName, phone || undefined);
      setMode('register-otp');
      toast('Account created! Enter OTP to verify.', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyNew(username, otp);
      router.replace('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      setError(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, otp);
      router.replace('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMode('choose');
    setUsername('');
    setDisplayName('');
    setPhone('');
    setOtp('');
    setError('');
  };

  return (
    <div className="h-full flex items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-brand mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-label-primary">Signal</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Choose login or register */}
        {mode === 'choose' && (
          <div className="space-y-3">
            <button
              onClick={() => setMode('login')}
              className="w-full py-3 bg-brand hover:bg-brand-hover text-white font-medium rounded-lg transition-colors"
            >
              Login
            </button>
            <button
              onClick={() => setMode('register')}
              className="w-full py-3 bg-bg-tertiary hover:bg-bg-active text-label-primary font-medium rounded-lg transition-colors"
            >
              Create Account
            </button>
          </div>
        )}

        {/* Step 2a: Register form */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <h2 className="text-lg font-semibold text-label-primary text-center">Create Account</h2>
            <div>
              <label className="block text-sm font-medium text-label-secondary mb-1.5">Username *</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-bg-tertiary rounded-lg text-sm text-label-primary placeholder:text-label-tertiary outline-none focus:ring-1 focus:ring-brand"
                placeholder="Choose a username"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-label-secondary mb-1.5">Display Name *</label>
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
              <label className="block text-sm font-medium text-label-secondary mb-1.5">Phone (optional)</label>
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
              {loading ? 'Creating account...' : 'Continue'}
            </button>
            <button
              type="button"
              onClick={reset}
              className="w-full py-2.5 text-label-secondary hover:text-label-primary text-sm transition-colors"
            >
              Back
            </button>
          </form>
        )}

        {/* Step 2b: Login — enter username */}
        {mode === 'login' && (
          <form onSubmit={(e) => { e.preventDefault(); setMode('login-otp'); }} className="space-y-4">
            <h2 className="text-lg font-semibold text-label-primary text-center">Login</h2>
            <div>
              <label className="block text-sm font-medium text-label-secondary mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-bg-tertiary rounded-lg text-sm text-label-primary placeholder:text-label-tertiary outline-none focus:ring-1 focus:ring-brand"
                placeholder="Enter your username"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-brand hover:bg-brand-hover text-white font-medium rounded-lg transition-colors"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={reset}
              className="w-full py-2.5 text-label-secondary hover:text-label-primary text-sm transition-colors"
            >
              Back
            </button>
          </form>
        )}

        {/* Step 3a: Login OTP verification */}
        {mode === 'login-otp' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <h2 className="text-lg font-semibold text-label-primary text-center">Enter OTP</h2>
            <p className="text-sm text-label-secondary text-center">
              Verifying as <span className="font-medium text-label-primary">{username}</span>
            </p>
            <div>
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
                Hint: use <code className="bg-bg-tertiary px-1 rounded">0000</code>
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? 'Verifying...' : 'Login'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('login'); setOtp(''); setError(''); }}
              className="w-full py-2.5 text-label-secondary hover:text-label-primary text-sm transition-colors"
            >
              Back
            </button>
          </form>
        )}

        {/* Step 3b: Register OTP verification */}
        {mode === 'register-otp' && (
          <form onSubmit={handleRegisterVerify} className="space-y-4">
            <h2 className="text-lg font-semibold text-label-primary text-center">Verify OTP</h2>
            <p className="text-sm text-label-secondary text-center">
              Account created for <span className="font-medium text-label-primary">{username}</span>
            </p>
            <div>
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
                Hint: use <code className="bg-bg-tertiary px-1 rounded">0000</code>
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify & Start'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setOtp(''); setError(''); }}
              className="w-full py-2.5 text-label-secondary hover:text-label-primary text-sm transition-colors"
            >
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
