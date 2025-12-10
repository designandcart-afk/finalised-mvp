'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2, User } from 'lucide-react';
import { Button } from '@/components/UI';
import { useAuth } from '@/lib/auth/authContext';

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signUp, isDemo, switchToReal } = useAuth();
  const router = useRouter();

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      // Don't automatically switch to real mode
      // Let users explicitly choose demo or real mode
      await signUp(formData.email, formData.name, formData.password);
      setSuccess(true);
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to create account'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-[#f2f0ed] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-2xl font-semibold text-[#2e2e2e] mb-4">
              Account Created Successfully!
            </h1>
            
            <p className="text-[#2e2e2e]/70 mb-6">
              We've sent a verification email to <strong>{formData.email}</strong>
            </p>
            
            <p className="text-[#2e2e2e]/70 mb-8">
              Please check your inbox and click the verification link to activate your account.
            </p>

            <div className="space-y-3">
              <Button
                onClick={() => router.push('/login')}
                className="w-full bg-[#d96857] text-white py-3 rounded-xl font-medium hover:bg-[#c85745] transition"
              >
                Go to Sign In
              </Button>
              
              <Button
                onClick={() => router.push('/')}
                className="w-full border border-zinc-300 text-[#2e2e2e] py-3 rounded-xl font-medium hover:bg-zinc-50 transition"
              >
                Back to Home
              </Button>
            </div>

            <p className="text-xs text-[#2e2e2e]/60 mt-6">
              Didn't receive the email? Check your spam folder or try signing up again.
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
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[#2e2e2e]/70 hover:text-[#d96857] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#d96857] to-[#c45745] flex items-center justify-center mb-4">
              <User className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-[#2e2e2e] mb-2">
              Create Account
            </h1>
            <p className="text-[#2e2e2e]/70">
              Join Design&Cart to start your design journey
            </p>
            
            {/* Real Auth Notice */}
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                <strong>Real Authentication:</strong> Create your account with a valid email address. 
                You'll receive a verification email to activate your account.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#2e2e2e] mb-2">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                disabled={isLoading}
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#d96857]/20 transition-all disabled:opacity-50 ${
                  errors.name ? 'border-red-500 focus:border-red-500' : 'border-zinc-200 focus:border-[#d96857]'
                }`}
                required
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#2e2e2e] mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@example.com"
                disabled={isLoading}
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#d96857]/20 transition-all disabled:opacity-50 ${
                  errors.email ? 'border-red-500 focus:border-red-500' : 'border-zinc-200 focus:border-[#d96857]'
                }`}
                required
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#2e2e2e] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="At least 8 characters"
                  disabled={isLoading}
                  className={`w-full px-4 py-3 pr-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#d96857]/20 transition-all disabled:opacity-50 ${
                    errors.password ? 'border-red-500 focus:border-red-500' : 'border-zinc-200 focus:border-[#d96857]'
                  }`}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#2e2e2e]/50 hover:text-[#2e2e2e] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#2e2e2e] mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm your password"
                  disabled={isLoading}
                  className={`w-full px-4 py-3 pr-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#d96857]/20 transition-all disabled:opacity-50 ${
                    errors.confirmPassword ? 'border-red-500 focus:border-red-500' : 'border-zinc-200 focus:border-[#d96857]'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#2e2e2e]/50 hover:text-[#2e2e2e] transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{errors.submit}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#d96857] text-white rounded-xl py-3 font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-[#2e2e2e]/70">
            Already have an account?{' '}
            <Link href="/login" className="text-[#d96857] hover:underline font-medium">
              Sign In
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-[#2e2e2e]/60">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </main>
  );
}
