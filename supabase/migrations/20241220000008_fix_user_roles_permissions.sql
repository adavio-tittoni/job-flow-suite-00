-- Migration: Fix user roles permissions
-- This migration ensures users can update roles properly

-- Update RLS policies for user_roles table
DROP POLICY IF EXISTS "Users can update their own user_roles." ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own user_roles." ON public.user_roles;

-- Create more permissive policies for user_roles
CREATE POLICY "Authenticated users can view all user_roles" ON public.user_roles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update user_roles" ON public.user_roles
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert user_roles" ON public.user_roles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete user_roles" ON public.user_roles
  FOR DELETE USING (auth.role() = 'authenticated');

-- Update RLS policies for profiles table
DROP POLICY IF EXISTS "Users can update their own profiles." ON public.profiles;

CREATE POLICY "Authenticated users can view all profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update profiles" ON public.profiles
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Add comment
COMMENT ON TABLE public.user_roles IS 'User roles table with permissive policies for authenticated users';
