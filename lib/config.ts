// Application Configuration
// Set to false to enable real Supabase authentication for production
export const DEMO_MODE = false;

// When DEMO_MODE is false:
// - Real Supabase authentication is enabled
// - Users must sign up/sign in with valid credentials
// - Data is stored in Supabase database
// - Email verification is required

// Demo user for fallback (when demo mode is enabled)
export const DEMO_USER = {
  id: 'demo-user-123',
  email: 'demo@designandcart.in',
  name: 'Demo User'
};

// Supabase configuration
export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
};
