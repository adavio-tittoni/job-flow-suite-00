-- Migration: Add missing fields to documents_catalog table
-- This migration adds the necessary fields for the document catalog system

-- Add missing columns to documents_catalog table if they don't exist
DO $$ 
BEGIN
    -- Add categoria field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'categoria') THEN
        ALTER TABLE documents_catalog ADD COLUMN categoria TEXT;
    END IF;
    
    -- Add detail field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'detail') THEN
        ALTER TABLE documents_catalog ADD COLUMN detail TEXT;
    END IF;
    
    -- Add sigla_documento field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'sigla_documento') THEN
        ALTER TABLE documents_catalog ADD COLUMN sigla_documento TEXT;
    END IF;
END $$;

-- Update existing records to populate the new fields
-- Map group_name to categoria for existing records
UPDATE documents_catalog 
SET categoria = group_name 
WHERE categoria IS NULL AND group_name IS NOT NULL;

-- Set default values for records that don't have group_name
UPDATE documents_catalog 
SET categoria = 'Outros' 
WHERE categoria IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_catalog_categoria ON documents_catalog(categoria);
CREATE INDEX IF NOT EXISTS idx_documents_catalog_sigla_documento ON documents_catalog(sigla_documento);
