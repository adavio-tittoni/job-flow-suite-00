-- Migration: Complete fix for user roles permissions
-- This migration completely fixes the 406 error when updating user roles

-- First, let's check and fix the user_roles table policies
DROP POLICY IF EXISTS "Public user_roles are viewable by everyone." ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own user_roles." ON public.user_roles;
DROP POLICY IF EXISTS "Users can update their own user_roles." ON public.user_roles;
DROP POLICY IF EXISTS "Users can delete their own user_roles." ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can view all user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can update user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can insert user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can delete user_roles" ON public.user_roles;

-- Create new, more permissive policies for user_roles
CREATE POLICY "user_roles_select_policy" ON public.user_roles
  FOR SELECT USING (true);

CREATE POLICY "user_roles_insert_policy" ON public.user_roles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "user_roles_update_policy" ON public.user_roles
  FOR UPDATE USING (true);

CREATE POLICY "user_roles_delete_policy" ON public.user_roles
  FOR DELETE USING (true);

-- Now let's check and fix the profiles table policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profiles." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profiles." ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profiles." ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can insert profiles" ON public.profiles;

-- Create new, more permissive policies for profiles
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE USING (true);

CREATE POLICY "profiles_delete_policy" ON public.profiles
  FOR DELETE USING (true);

-- Ensure the tables have the correct RLS settings
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add comment
COMMENT ON TABLE public.user_roles IS 'User roles table with permissive policies to fix 406 errors';
COMMENT ON TABLE public.profiles IS 'Profiles table with permissive policies to fix 406 errors';
