-- Add codigo field to candidate_documents table
ALTER TABLE candidate_documents ADD COLUMN IF NOT EXISTS codigo TEXT;

-- Create index for better performance on codigo field
CREATE INDEX IF NOT EXISTS idx_candidate_documents_codigo ON candidate_documents(codigo);
