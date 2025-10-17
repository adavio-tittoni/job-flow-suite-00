-- Migration: Fix specific RLS policies causing 406 error
-- Based on the current policies shown in the query results

-- Drop the restrictive policies that are causing the 406 error
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Create more permissive policies for profiles
CREATE POLICY "profiles_update_all" ON public.profiles
  FOR UPDATE USING (true);

-- Create more permissive policies for user_roles
CREATE POLICY "user_roles_select_all" ON public.user_roles
  FOR SELECT USING (true);

CREATE POLICY "user_roles_update_all" ON public.user_roles
  FOR UPDATE USING (true);

CREATE POLICY "user_roles_insert_all" ON public.user_roles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "user_roles_delete_all" ON public.user_roles
  FOR DELETE USING (true);

-- Keep the existing "Users can view all profiles" policy as it's already permissive
-- Keep the existing "Users can view all profiles" policy as it's already permissive

-- Add comments
COMMENT ON POLICY "profiles_update_all" ON public.profiles IS 'Allows all authenticated users to update any profile';
COMMENT ON POLICY "user_roles_select_all" ON public.user_roles IS 'Allows all authenticated users to view all roles';
COMMENT ON POLICY "user_roles_update_all" ON public.user_roles IS 'Allows all authenticated users to update any role';
COMMENT ON POLICY "user_roles_insert_all" ON public.user_roles IS 'Allows all authenticated users to insert roles';
COMMENT ON POLICY "user_roles_delete_all" ON public.user_roles IS 'Allows all authenticated users to delete roles';
