-- Fix RLS policy to allow order updates after payment
-- Run this in Supabase SQL Editor NOW

-- Drop and recreate the update policy with proper permissions
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;

CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Verify RLS is enabled
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
