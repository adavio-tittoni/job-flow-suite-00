-- Migration: Update documents_catalog table structure for STWC and NR documents
-- This migration adds all necessary fields for both STWC (maritime) and NR (regulatory) documents

-- Add missing columns to documents_catalog table if they don't exist
DO $$ 
BEGIN
    -- Add categoria field (main category)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'categoria') THEN
        ALTER TABLE documents_catalog ADD COLUMN categoria TEXT;
    END IF;
    
    -- Add codigo field (STWC code like A-II/1 or NR code like NR-10)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'codigo') THEN
        ALTER TABLE documents_catalog ADD COLUMN codigo TEXT;
    END IF;
    
    -- Add sigla field (acronym/abbreviation)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'sigla') THEN
        ALTER TABLE documents_catalog ADD COLUMN sigla TEXT;
    END IF;
    
    -- Add nome_curso field (course name - main name field)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'nome_curso') THEN
        ALTER TABLE documents_catalog ADD COLUMN nome_curso TEXT;
    END IF;
    
    -- Add descricao_curso field (course description)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'descricao_curso') THEN
        ALTER TABLE documents_catalog ADD COLUMN descricao_curso TEXT;
    END IF;
    
    -- Add carga_horaria field (course duration in hours)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'carga_horaria') THEN
        ALTER TABLE documents_catalog ADD COLUMN carga_horaria TEXT;
    END IF;
    
    -- Add validade field (validity period)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'validade') THEN
        ALTER TABLE documents_catalog ADD COLUMN validade TEXT;
    END IF;
    
    -- Add modalidade field (delivery method)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'modalidade') THEN
        ALTER TABLE documents_catalog ADD COLUMN modalidade TEXT;
    END IF;
    
    -- Add detalhes field (additional details/observations)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'detalhes') THEN
        ALTER TABLE documents_catalog ADD COLUMN detalhes TEXT;
    END IF;
    
    -- Add url_site field (website URL)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'url_site') THEN
        ALTER TABLE documents_catalog ADD COLUMN url_site TEXT;
    END IF;
    
    -- Add flag_requisito field (for STWC documents - sim, não, sempre, depende)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents_catalog' AND column_name = 'flag_requisito') THEN
        ALTER TABLE documents_catalog ADD COLUMN flag_requisito TEXT;
    END IF;
    
    -- Add nome_ingles field (English name for STWC documents)
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_catalog_categoria ON documents_catalog(categoria);
CREATE INDEX IF NOT EXISTS idx_documents_catalog_codigo ON documents_catalog(codigo);
CREATE INDEX IF NOT EXISTS idx_documents_catalog_sigla ON documents_catalog(sigla);
CREATE INDEX IF NOT EXISTS idx_documents_catalog_modalidade ON documents_catalog(modalidade);
CREATE INDEX IF NOT EXISTS idx_documents_catalog_flag_requisito ON documents_catalog(flag_requisito);
