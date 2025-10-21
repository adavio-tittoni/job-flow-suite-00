-- Migration: Add codigo field to candidate_documents table
-- This migration adds a codigo field to allow custom document codes for comparison

-- Add codigo field to candidate_documents table if it doesn't exist
DO $$ 
BEGIN
    -- Add codigo field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidate_documents' AND column_name = 'codigo') THEN
        ALTER TABLE candidate_documents ADD COLUMN codigo TEXT;
    END IF;
END $$;

-- Create index for better performance on codigo field
CREATE INDEX IF NOT EXISTS idx_candidate_documents_codigo ON candidate_documents(codigo);
