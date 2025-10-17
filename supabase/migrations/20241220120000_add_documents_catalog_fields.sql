-- Migration: Add missing fields to documents_catalog table
-- This migration adds all necessary fields for STWC and NR documents

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
UPDATE documents_catalog 
SET categoria = COALESCE(group_name, 'Outros')
WHERE categoria IS NULL;

UPDATE documents_catalog 
SET nome_curso = COALESCE(name, '')
WHERE nome_curso IS NULL;

