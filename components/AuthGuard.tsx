'use client';

import { useAuth } from '@/lib/auth/authContext';
import { useState } from 'react';
import { Button, Input } from './UI';
import { Lock } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setSubmitting(true);
    setError('');
    try {
      await signIn(email, password);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        {/* Design&Cart Logo */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#d96857] to-[#c45745] flex items-center justify-center">
            <div className="w-6 h-6 bg-[#2e2e2e] rounded-sm"></div>
          </div>
          <h1 className="text-2xl font-bold text-[#d96857]">Design&Cart</h1>
        </div>
        
        {/* Loading Animation */}
        <div className="flex items-center gap-2 text-[#2e2e2e]/70">
          <div className="w-5 h-5 border-2 border-[#d96857] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  // If user is authenticated, show the protected content
  if (user) {
    return <>{children}</>;
  }

  // If not authenticated, show sign-in form on left and message on right
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left: Sign In Form */}
          <div className="order-2 lg:order-1">
            <div className="sticky top-8">
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-[#d96857]/10 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-[#d96857]" />
                  </div>
                  <h2 className="text-xl font-semibold text-[#2e2e2e]">Sign In</h2>
                </div>

                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-[#2e2e2e] mb-1.5">
                      Email Address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-[#2e2e2e] mb-1.5">
                      Password
                    </label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                      <p className="text-red-600 text-sm">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={submitting || !email || !password}
                    className="w-full bg-[#d96857] text-white py-2.5 rounded-2xl font-medium hover:opacity-95 disabled:opacity-50"
                  >
                    {submitting ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t border-zinc-200">
                  <p className="text-sm text-zinc-600 text-center">
                    Don't have an account?{' '}
                    <a href="/signup" className="text-[#d96857] hover:underline font-medium">
                      Sign up
                    </a>
                  </p>
                  <p className="text-sm text-zinc-600 text-center mt-2">
                    <a href="/reset-password" className="text-zinc-500 hover:text-[#d96857] hover:underline">
                      Forgot password?
                    </a>
                  </p>
                </div>

                {/* Demo credentials hint */}
                <div className="mt-6 p-3 bg-[#f2f0ed] rounded-xl border border-zinc-200">
                  <p className="text-xs text-zinc-600 text-center">
                    <strong>Demo Mode:</strong> Login using demo@designandcart.in and password demo123 to see the demo interface
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Message */}
          <div className="order-1 lg:order-2 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#f2f0ed] flex items-center justify-center">
                <Lock className="w-12 h-12 text-[#d96857]" />
              </div>
              <h1 className="text-3xl font-bold text-[#2e2e2e] mb-4">
                Please Sign In to Access
              </h1>
              <p className="text-lg text-zinc-600 mb-6">
                This page requires authentication. Sign in to view your projects, orders, and cart.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#faf8f6] rounded-2xl border border-zinc-200">
                <span className="text-sm text-zinc-600">
                  New to Design n Cart?
                </span>
                <a href="/signup" className="text-sm font-medium text-[#d96857] hover:underline">
                  Create an account
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
