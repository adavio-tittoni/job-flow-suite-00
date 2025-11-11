-- Create help_content table to store help documentation
CREATE TABLE IF NOT EXISTS public.help_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL DEFAULT '',
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default empty content if table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.help_content LIMIT 1) THEN
    INSERT INTO public.help_content (content) 
    VALUES ('');
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.help_content ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read help content
CREATE POLICY "Anyone can read help content"
  ON public.help_content
  FOR SELECT
  USING (true);

-- Policy: Only administrators can update help content
CREATE POLICY "Only administrators can update help content"
  ON public.help_content
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('administrador', 'superadministrador')
    )
  );

-- Policy: Only administrators can insert help content
CREATE POLICY "Only administrators can insert help content"
  ON public.help_content
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('administrador', 'superadministrador')
    )
  );

