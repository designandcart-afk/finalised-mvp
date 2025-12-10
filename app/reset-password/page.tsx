'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/UI';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setErrors({ email: 'Email is required' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    try {
      setIsLoading(true);
      setErrors({});

      // Call the password reset API
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to send reset email');
      }

      setSuccess(true);
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to send reset email'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-[#f2f0ed] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>

            <h1 className="text-2xl font-semibold text-[#2e2e2e] mb-4">
              Check Your Email
            </h1>
            
            <p className="text-[#2e2e2e]/70 mb-6">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            
            <p className="text-[#2e2e2e]/70 mb-8">
              Click the link in the email to reset your password. The link will expire in 1 hour.
            </p>

            <div className="space-y-3">
              <Button
                onClick={() => router.push('/login')}
                className="w-full bg-[#d96857] text-white py-3 rounded-xl font-medium hover:bg-[#c85745] transition"
              >
                Back to Sign In
              </Button>
              
              <Button
                onClick={() => router.push('/')}
                className="w-full border border-zinc-300 text-[#2e2e2e] py-3 rounded-xl font-medium hover:bg-zinc-50 transition"
              >
                Back to Home
              </Button>
            </div>

            <p className="text-xs text-[#2e2e2e]/60 mt-6">
              Didn't receive the email? Check your spam folder or try again.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f2f0ed] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Link 
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-[#2e2e2e]/70 hover:text-[#d96857] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#d96857] to-[#c45745] flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-[#2e2e2e] mb-2">
              Reset Your Password
            </h1>
            <p className="text-[#2e2e2e]/70">
              Enter your email address and we'll send you a link to reset your password
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#2e2e2e] mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isLoading}
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#d96857]/20 transition-all disabled:opacity-50 ${
                  errors.email ? 'border-red-500 focus:border-red-500' : 'border-zinc-200 focus:border-[#d96857]'
                }`}
                required
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{errors.submit}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || !email}
              className="w-full bg-[#d96857] text-white rounded-xl py-3 font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending Reset Link...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-[#2e2e2e]/70">
            Remember your password?{' '}
            <Link href="/login" className="text-[#d96857] hover:underline font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
