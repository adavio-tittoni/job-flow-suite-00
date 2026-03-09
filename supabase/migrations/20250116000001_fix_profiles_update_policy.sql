-- Migration: Fix profiles update policy to allow admins to update any profile
-- This fixes the issue where updates return 0 affected rows

-- Drop the restrictive policy that only allows users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create a policy that allows:
-- 1. Users to update their own profile
-- 2. Administrators to update any profile
CREATE POLICY "Users can update own profile or admins can update any" 
  ON public.profiles 
  FOR UPDATE 
  TO authenticated 
  USING (
    auth.uid() = id 
    OR has_role(auth.uid(), 'administrador') 
    OR has_role(auth.uid(), 'superadministrador')
  );

-- Add comment
COMMENT ON POLICY "Users can update own profile or admins can update any" 
  ON public.profiles 
  IS 'Allows users to update their own profile, or administrators to update any profile';

