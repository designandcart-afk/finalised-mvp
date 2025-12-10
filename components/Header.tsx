'use client';

import Link from 'next/link';
import { Search, User, LogOut, LogIn } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth/authContext';
import { useRouter, usePathname } from 'next/navigation';
import { useProjects } from '@/lib/contexts/projectsContext';
import { supabase } from '@/lib/supabase';

export default function Header() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();
  const { projects } = useProjects();
  const router = useRouter();
  const pathname = usePathname();

  // Fetch designer name from designer_details
  useEffect(() => {
    async function fetchDesignerName() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('designer_details')
          .select('name')
          .eq('user_id', user.id)
          .single();
        
        if (!error && data?.name) {
          setDisplayName(data.name);
        } else {
          // Fallback to email username
          setDisplayName(user.email?.split('@')[0] || 'User');
        }
      } catch (err) {
        // Fallback to email username
        setDisplayName(user.email?.split('@')[0] || 'User');
      }
    }
    
    fetchDesignerName();
  }, [user]);

  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsDropdownOpen(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setIsDropdownOpen(false);
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-[#efeee9]/95 border-b border-[#2e2e2e]/10 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center" aria-hidden="true">
          <img src="/logo.png" alt="Design&Cart" className="h-9 w-auto" />
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-[15px]">
          <Link href="/products" className={`transition-colors relative group px-2 py-1 ${
            pathname === '/products' ? 'text-[#d96857]' : 'text-[#2e2e2e]/70 hover:text-[#d96857]'
          }`}>
            Products
            <span className={`absolute inset-x-0 bottom-0 h-0.5 bg-[#d96857] transition-transform origin-left ${
              pathname === '/products' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
            }`} />
          </Link>
          <Link href="/" className={`transition-colors relative group px-2 py-1 ${
            pathname === '/' ? 'text-[#d96857]' : 'text-[#2e2e2e]/70 hover:text-[#d96857]'
          }`}>
            Dashboard
            <span className={`absolute inset-x-0 bottom-0 h-0.5 bg-[#d96857] transition-transform origin-left ${
              pathname === '/' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
            }`} />
          </Link>
          <Link href="/chat" className={`transition-colors relative group px-2 py-1 ${
            pathname === '/chat' ? 'text-[#d96857]' : 'text-[#2e2e2e]/70 hover:text-[#d96857]'
          }`}>
            Chat
            <span className={`absolute inset-x-0 bottom-0 h-0.5 bg-[#d96857] transition-transform origin-left ${
              pathname === '/chat' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
            }`} />
          </Link>
          <Link href="/cart" className={`transition-colors relative group px-2 py-1 ${
            pathname === '/cart' ? 'text-[#d96857]' : 'text-[#2e2e2e]/70 hover:text-[#d96857]'
          }`}>
            Cart
            <span className={`absolute inset-x-0 bottom-0 h-0.5 bg-[#d96857] transition-transform origin-left ${
              pathname === '/cart' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
            }`} />
          </Link>
          <Link href="/orders" className={`transition-colors relative group px-2 py-1 ${
            pathname === '/orders' ? 'text-[#d96857]' : 'text-[#2e2e2e]/70 hover:text-[#d96857]'
          }`}>
            Orders
            <span className={`absolute inset-x-0 bottom-0 h-0.5 bg-[#d96857] transition-transform origin-left ${
              pathname === '/orders' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
            }`} />
          </Link>
          <Link href="/account" className={`transition-colors relative group px-2 py-1 ${
            pathname === '/account' ? 'text-[#d96857]' : 'text-[#2e2e2e]/70 hover:text-[#d96857]'
          }`}>
            Account
            <span className={`absolute inset-x-0 bottom-0 h-0.5 bg-[#d96857] transition-transform origin-left ${
              pathname === '/account' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
            }`} />
          </Link>
        </nav>

        {/* Profile */}
        <div className="flex items-center gap-4">
          <div className="relative" ref={dropdownRef}>
            {/* Profile/Sign In Button */}
            {user ? (
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="hidden sm:flex items-center gap-3 bg-white border border-[#2e2e2e]/10 rounded-xl px-4 py-2 hover:border-[#d96857]/30 hover:shadow-sm transition-all duration-200"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#d96857] to-[#c45745] flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-[#2e2e2e]">
                  {displayName}
                </span>
              </button>
            ) : (
              <Link
                href="/login"
                className="hidden sm:flex items-center gap-3 bg-white border border-[#2e2e2e]/10 rounded-xl px-4 py-2 hover:border-[#d96857]/30 hover:shadow-sm transition-all duration-200"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#d96857] to-[#c45745] flex items-center justify-center">
                  <LogIn className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-[#2e2e2e]">
                  Sign In
                </span>
              </Link>
            )}

            {/* Dropdown Menu */}
            {user && isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-[#2e2e2e]/10 py-2 z-50">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#d96857] hover:bg-[#f8f7f4] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}