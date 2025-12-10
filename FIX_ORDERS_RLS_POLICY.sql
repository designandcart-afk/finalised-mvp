-- Fix RLS policy for orders to allow payment verification updates
-- Run this in Supabase SQL Editor

-- Drop existing policy
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;

-- Create new policy that allows updates for authenticated users
CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Also ensure service role can bypass RLS (for API routes)
-- This is already the default, but let's verify
ALTER TABLE public.orders FORCE ROW LEVEL SECURITY;

-- Add a policy for service role if needed
DROP POLICY IF EXISTS "Service role can manage all orders" ON public.orders;
CREATE POLICY "Service role can manage all orders"
  ON public.orders
  USING (true)
  WITH CHECK (true);

