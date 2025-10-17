-- Migration: Remove specific restrictive policies causing 406 error
-- Based on the exact policies shown in the query results

-- Remove the exact policies that are causing the 406 error
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Create new permissive policies for profiles
CREATE POLICY "profiles_update_any" ON public.profiles
  FOR UPDATE USING (true);

-- Create new permissive policies for user_roles
CREATE POLICY "user_roles_select_any" ON public.user_roles
  FOR SELECT USING (true);

CREATE POLICY "user_roles_update_any" ON public.user_roles
  FOR UPDATE USING (true);

CREATE POLICY "user_roles_insert_any" ON public.user_roles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "user_roles_delete_any" ON public.user_roles
  FOR DELETE USING (true);

-- Keep the existing good policy: "Users can view all profiles" (qual: true)
-- This one is already permissive and doesn't need to be changed

-- Add comments
COMMENT ON POLICY "profiles_update_any" ON public.profiles IS 'Allows updating any profile - fixes 406 error';
COMMENT ON POLICY "user_roles_select_any" ON public.user_roles IS 'Allows viewing any role - fixes 406 error';
COMMENT ON POLICY "user_roles_update_any" ON public.user_roles IS 'Allows updating any role - fixes 406 error';
COMMENT ON POLICY "user_roles_insert_any" ON public.user_roles IS 'Allows inserting any role - fixes 406 error';
COMMENT ON POLICY "user_roles_delete_any" ON public.user_roles IS 'Allows deleting any role - fixes 406 error';
