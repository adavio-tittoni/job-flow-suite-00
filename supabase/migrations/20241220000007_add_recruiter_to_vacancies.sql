-- Migration: Add recruiter field to vacancies table
-- This migration adds the recruiter_id field to link vacancies to specific recruiters

-- Add recruiter_id field to vacancies table
DO $$ 
BEGIN
    -- Add recruiter_id field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vacancies' AND column_name = 'recruiter_id') THEN
        ALTER TABLE vacancies ADD COLUMN recruiter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_vacancies_recruiter_id ON vacancies(recruiter_id);

-- Add comment to explain the field
COMMENT ON COLUMN vacancies.recruiter_id IS 'ID do recrutador responsável pela vaga';
