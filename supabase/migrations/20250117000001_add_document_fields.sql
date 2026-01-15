-- Migration: Add sigla_ingles, reciclagem and equivalente fields to documents_catalog table
-- This migration adds new fields for English acronym, recycling codes, and equivalent codes

-- Add missing columns to documents_catalog table if they don't exist
DO $$ 
BEGIN
    -- Add sigla_ingles field (English acronym)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'sigla_ingles') THEN
        ALTER TABLE documents_catalog ADD COLUMN sigla_ingles TEXT;
    END IF;
    
    -- Add reciclagem field (recycling codes/siglas)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'reciclagem') THEN
        ALTER TABLE documents_catalog ADD COLUMN reciclagem TEXT;
    END IF;
    
    -- Add equivalente field (equivalent codes/siglas)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'equivalente') THEN
        ALTER TABLE documents_catalog ADD COLUMN equivalente TEXT;
    END IF;
END $$;
