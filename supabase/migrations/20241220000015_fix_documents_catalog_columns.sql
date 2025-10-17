-- Migration: Fix documents_catalog table columns
-- This migration ensures all required columns exist

-- Add missing columns to documents_catalog table if they don't exist
DO $$ 
BEGIN
    -- Add categoria field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'categoria') THEN
        ALTER TABLE documents_catalog ADD COLUMN categoria TEXT;
    END IF;
    
    -- Add codigo field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'codigo') THEN
        ALTER TABLE documents_catalog ADD COLUMN codigo TEXT;
    END IF;
    
    -- Add sigla field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'sigla') THEN
        ALTER TABLE documents_catalog ADD COLUMN sigla TEXT;
    END IF;
    
    -- Add nome_curso field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'nome_curso') THEN
        ALTER TABLE documents_catalog ADD COLUMN nome_curso TEXT;
    END IF;
    
    -- Add descricao_curso field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'descricao_curso') THEN
        ALTER TABLE documents_catalog ADD COLUMN descricao_curso TEXT;
    END IF;
    
    -- Add carga_horaria field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'carga_horaria') THEN
        ALTER TABLE documents_catalog ADD COLUMN carga_horaria TEXT;
    END IF;
    
    -- Add validade field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'validade') THEN
        ALTER TABLE documents_catalog ADD COLUMN validade TEXT;
    END IF;
    
    -- Add modalidade field (if not exists)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'modalidade') THEN
        ALTER TABLE documents_catalog ADD COLUMN modalidade TEXT;
    END IF;
    
    -- Add detalhes field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'detalhes') THEN
        ALTER TABLE documents_catalog ADD COLUMN detalhes TEXT;
    END IF;
    
    -- Add url_site field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'url_site') THEN
        ALTER TABLE documents_catalog ADD COLUMN url_site TEXT;
    END IF;
    
    -- Add flag_requisito field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'flag_requisito') THEN
        ALTER TABLE documents_catalog ADD COLUMN flag_requisito TEXT;
    END IF;
    
    -- Add nome_ingles field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'nome_ingles') THEN
        ALTER TABLE documents_catalog ADD COLUMN nome_ingles TEXT;
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

-- Map name to nome_curso for existing records
UPDATE documents_catalog 
SET nome_curso = name 
WHERE nome_curso IS NULL AND name IS NOT NULL;

