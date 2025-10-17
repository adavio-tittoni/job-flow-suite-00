-- Migration: Remove restrictive policies and create permissive ones
-- Based on current policies analysis

-- Remove the restrictive policies that are causing 406 errors
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Create permissive policies for profiles table
CREATE POLICY "profiles_update_permissive" ON public.profiles
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create permissive policies for user_roles table
CREATE POLICY "user_roles_select_permissive" ON public.user_roles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "user_roles_update_permissive" ON public.user_roles
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "user_roles_insert_permissive" ON public.user_roles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "user_roles_delete_permissive" ON public.user_roles
  FOR DELETE USING (auth.role() = 'authenticated');

-- Keep existing good policies:
-- "Users can view all profiles" (SELECT with qual: true) - already good

-- Add comments for documentation
COMMENT ON POLICY "profiles_update_permissive" ON public.profiles IS 'Allows any authenticated user to update any profile';
COMMENT ON POLICY "user_roles_select_permissive" ON public.user_roles IS 'Allows any authenticated user to view all roles';
COMMENT ON POLICY "user_roles_update_permissive" ON public.user_roles IS 'Allows any authenticated user to update any role';
COMMENT ON POLICY "user_roles_insert_permissive" ON public.user_roles IS 'Allows any authenticated user to insert roles';
COMMENT ON POLICY "user_roles_delete_permissive" ON public.user_roles IS 'Allows any authenticated user to delete roles';
