-- Migration: Enable RLS and allow all authenticated users to view candidate data
-- This allows users with role "recrutador" to view all candidate information and comparisons

-- 1. Enable RLS on tables that have policies but RLS disabled
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

-- 2. Drop restrictive viewing policies and create permissive ones for SELECT

-- Candidates: Ensure all authenticated users can view
DROP POLICY IF EXISTS "Authenticated users can view candidates" ON public.candidates;
DROP POLICY IF EXISTS "Recruiters can manage candidates" ON public.candidates;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.candidates;

CREATE POLICY "All authenticated users can view candidates" 
  ON public.candidates 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Recruiters and admins can manage candidates" 
  ON public.candidates 
  FOR ALL 
  TO authenticated 
  USING (
    has_role(auth.uid(), 'administrador') 
    OR has_role(auth.uid(), 'superadministrador') 
    OR has_role(auth.uid(), 'recrutador')
  )
  WITH CHECK (
    has_role(auth.uid(), 'administrador') 
    OR has_role(auth.uid(), 'superadministrador') 
    OR has_role(auth.uid(), 'recrutador')
  );

-- Applications: Ensure all authenticated users can view
DROP POLICY IF EXISTS "Authenticated users can view applications" ON public.applications;
DROP POLICY IF EXISTS "Recruiters can manage applications" ON public.applications;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.applications;

CREATE POLICY "All authenticated users can view applications" 
  ON public.applications 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Recruiters and admins can manage applications" 
  ON public.applications 
  FOR ALL 
  TO authenticated 
  USING (
    has_role(auth.uid(), 'administrador') 
    OR has_role(auth.uid(), 'superadministrador') 
    OR has_role(auth.uid(), 'recrutador')
  )
  WITH CHECK (
    has_role(auth.uid(), 'administrador') 
    OR has_role(auth.uid(), 'superadministrador') 
    OR has_role(auth.uid(), 'recrutador')
  );

-- Documents catalog: Ensure all authenticated users can view
DROP POLICY IF EXISTS "Allow authenticated users to read documents_catalog" ON public.documents_catalog;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.documents_catalog;

CREATE POLICY "All authenticated users can view documents_catalog" 
  ON public.documents_catalog 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Keep existing INSERT/UPDATE/DELETE policies for documents_catalog (only admins)

-- Matrices: Add policy for all authenticated users to view (keep existing admin-only manage policy)
DROP POLICY IF EXISTS "Admins can view matrices" ON public.matrices;

CREATE POLICY "All authenticated users can view matrices" 
  ON public.matrices 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Keep existing "Admins can manage matrices" policy for INSERT/UPDATE/DELETE

-- Matrix items: Add policy for all authenticated users to view (keep existing admin-only manage policy)
DROP POLICY IF EXISTS "Admins can view matrix_items" ON public.matrix_items;

CREATE POLICY "All authenticated users can view matrix_items" 
  ON public.matrix_items 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Keep existing "Admins can manage matrix_items" policy for INSERT/UPDATE/DELETE

-- Pipeline stages: Create policies (RLS was disabled)
DROP POLICY IF EXISTS "Everyone can view stages" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Only admins can manage stages" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.pipeline_stages;

CREATE POLICY "All authenticated users can view pipeline_stages" 
  ON public.pipeline_stages 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Only admins can manage pipeline_stages" 
  ON public.pipeline_stages 
  FOR ALL 
  TO authenticated 
  USING (
    has_role(auth.uid(), 'administrador') 
    OR has_role(auth.uid(), 'superadministrador')
  )
  WITH CHECK (
    has_role(auth.uid(), 'administrador') 
    OR has_role(auth.uid(), 'superadministrador')
  );

-- Vacancies: Policies already allow viewing for all authenticated users, just ensure RLS is enabled
-- (Already has "Authenticated users can view vacancies" policy)

-- Candidate documents and history already have permissive SELECT policies
-- "Users can view candidate documents" and "Users can view candidate history" both use auth.role() = 'authenticated'

-- Add comments
COMMENT ON POLICY "All authenticated users can view candidates" ON public.candidates 
  IS 'Allows all authenticated users (including recrutadores) to view all candidate data';
COMMENT ON POLICY "All authenticated users can view applications" ON public.applications 
  IS 'Allows all authenticated users to view all applications';
COMMENT ON POLICY "All authenticated users can view documents_catalog" ON public.documents_catalog 
  IS 'Allows all authenticated users to view the documents catalog';
COMMENT ON POLICY "All authenticated users can view matrices" ON public.matrices 
  IS 'Allows all authenticated users to view matrices for comparison purposes';
COMMENT ON POLICY "All authenticated users can view matrix_items" ON public.matrix_items 
  IS 'Allows all authenticated users to view matrix items for comparison purposes';
COMMENT ON POLICY "All authenticated users can view pipeline_stages" ON public.pipeline_stages 
  IS 'Allows all authenticated users to view pipeline stages';

