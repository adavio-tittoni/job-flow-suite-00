-- Migration to update candidate system with all required functionality
-- This migration adds all necessary tables and columns for the complete candidate management system

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create candidates table with all required fields
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    email TEXT,
    phones TEXT,
    cpf TEXT,
    role_title TEXT,
    linkedin_url TEXT,
    working_status TEXT,
    blacklisted BOOLEAN DEFAULT FALSE,
    photo_url TEXT,
    address_type TEXT,
    address_street TEXT,
    address_number TEXT,
    address_complement TEXT,
    address_district TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    cs_responsible_id UUID REFERENCES auth.users(id),
    notes TEXT,
    matrix_id UUID REFERENCES matrices(id)
);

-- Create candidate_documents table
CREATE TABLE IF NOT EXISTS candidate_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    group_name TEXT,
    document_name TEXT NOT NULL,
    document_type TEXT,
    document_category TEXT,
    modality TEXT,
    registration_number TEXT,
    issue_date DATE,
    expiry_date DATE,
    issuing_authority TEXT,
    carga_horaria_total INTEGER,
    carga_horaria_teorica INTEGER,
    carga_horaria_pratica INTEGER,
    link_validacao TEXT,
    file_url TEXT,
    catalog_document_id UUID REFERENCES documents_catalog(id),
    detail TEXT,
    arquivo_original TEXT
);

-- Create candidate_history table
CREATE TABLE IF NOT EXISTS candidate_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    event_date DATE NOT NULL,
    description TEXT,
    vacancy_id UUID,
    approved BOOLEAN
);

-- Create matrices table
CREATE TABLE IF NOT EXISTS matrices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cargo TEXT NOT NULL,
    empresa TEXT NOT NULL,
    solicitado_por TEXT NOT NULL,
    versao_matriz TEXT NOT NULL,
    user_email TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create matrix_items table
CREATE TABLE IF NOT EXISTS matrix_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    matrix_id UUID NOT NULL REFERENCES matrices(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents_catalog(id),
    obrigatoriedade TEXT NOT NULL,
    carga_horaria INTEGER,
    modalidade TEXT NOT NULL,
    regra_validade TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents_catalog table
CREATE TABLE IF NOT EXISTS documents_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    group_name TEXT,
    document_type TEXT,
    document_category TEXT,
    modality TEXT,
    issuing_authority TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('superadministrador', 'administrador', 'recrutador')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_candidates_matrix_id ON candidates(matrix_id);
CREATE INDEX IF NOT EXISTS idx_candidates_created_by ON candidates(created_by);
CREATE INDEX IF NOT EXISTS idx_candidate_documents_candidate_id ON candidate_documents(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_documents_catalog_id ON candidate_documents(catalog_document_id);
CREATE INDEX IF NOT EXISTS idx_candidate_history_candidate_id ON candidate_history(candidate_id);
CREATE INDEX IF NOT EXISTS idx_matrix_items_matrix_id ON matrix_items(matrix_id);
CREATE INDEX IF NOT EXISTS idx_matrix_items_document_id ON matrix_items(document_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidate_documents_updated_at BEFORE UPDATE ON candidate_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidate_history_updated_at BEFORE UPDATE ON candidate_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_catalog_updated_at BEFORE UPDATE ON documents_catalog
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE matrices ENABLE ROW LEVEL SECURITY;
ALTER TABLE matrix_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for candidates
CREATE POLICY "Users can view all candidates" ON candidates
    FOR SELECT USING (true);

CREATE POLICY "Users can insert candidates" ON candidates
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update candidates" ON candidates
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete candidates" ON candidates
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create RLS policies for candidate_documents
CREATE POLICY "Users can view all candidate documents" ON candidate_documents
    FOR SELECT USING (true);

CREATE POLICY "Users can insert candidate documents" ON candidate_documents
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update candidate documents" ON candidate_documents
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete candidate documents" ON candidate_documents
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create RLS policies for candidate_history
CREATE POLICY "Users can view all candidate history" ON candidate_history
    FOR SELECT USING (true);

CREATE POLICY "Users can insert candidate history" ON candidate_history
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update candidate history" ON candidate_history
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete candidate history" ON candidate_history
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create RLS policies for matrices
CREATE POLICY "Users can view all matrices" ON matrices
    FOR SELECT USING (true);

CREATE POLICY "Users can insert matrices" ON matrices
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update matrices" ON matrices
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete matrices" ON matrices
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create RLS policies for matrix_items
CREATE POLICY "Users can view all matrix items" ON matrix_items
    FOR SELECT USING (true);

CREATE POLICY "Users can insert matrix items" ON matrix_items
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update matrix items" ON matrix_items
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete matrix items" ON matrix_items
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create RLS policies for documents_catalog
CREATE POLICY "Users can view all documents catalog" ON documents_catalog
    FOR SELECT USING (true);

CREATE POLICY "Users can insert documents catalog" ON documents_catalog
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update documents catalog" ON documents_catalog
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete documents catalog" ON documents_catalog
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create RLS policies for user_roles
CREATE POLICY "Users can view all user roles" ON user_roles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert user roles" ON user_roles
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update user roles" ON user_roles
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete user roles" ON user_roles
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert profiles" ON profiles
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update profiles" ON profiles
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete profiles" ON profiles
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Insert some sample data for testing
INSERT INTO documents_catalog (name, group_name, document_category, document_type) VALUES
('RG', 'Identificação', 'Documento de Identidade', 'Identidade'),
('CPF', 'Identificação', 'Documento de Identidade', 'CPF'),
('CNH', 'Identificação', 'Documento de Identidade', 'Carteira de Habilitação'),
('Certificado de Conclusão', 'Educação', 'Certificado', 'Educacional'),
('Diploma', 'Educação', 'Certificado', 'Educacional'),
('Certificado de Curso', 'Educação', 'Certificado', 'Educacional'),
('Comprovante de Residência', 'Residência', 'Comprovante', 'Residencial'),
('Contrato de Trabalho', 'Trabalho', 'Contrato', 'Trabalhista'),
('Carteira de Trabalho', 'Trabalho', 'Documento', 'Trabalhista'),
('Atestado Médico', 'Saúde', 'Atestado', 'Médico')
ON CONFLICT (name) DO NOTHING;

-- Create a sample matrix for testing
INSERT INTO matrices (cargo, empresa, solicitado_por, versao_matriz, user_email) VALUES
('Desenvolvedor Full Stack', 'TechCorp', 'João Silva', '1.0', 'joao@techcorp.com'),
('Analista de Sistemas', 'TechCorp', 'Maria Santos', '1.0', 'maria@techcorp.com')
ON CONFLICT DO NOTHING;

-- Add sample matrix items
INSERT INTO matrix_items (matrix_id, document_id, obrigatoriedade, carga_horaria, modalidade, regra_validade)
SELECT 
    m.id,
    d.id,
    CASE 
        WHEN d.name IN ('RG', 'CPF', 'CNH') THEN 'Obrigatório'
        WHEN d.name LIKE '%Certificado%' THEN 'Recomendado'
        ELSE 'Opcional'
    END,
    CASE 
        WHEN d.name LIKE '%Curso%' THEN 40
        ELSE NULL
    END,
    'Presencial',
    'Válido por 2 anos'
FROM matrices m
CROSS JOIN documents_catalog d
WHERE m.empresa = 'TechCorp'
ON CONFLICT DO NOTHING;
