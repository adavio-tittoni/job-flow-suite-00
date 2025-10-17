-- Migration: Create funnels and funnel_stages tables
-- These tables manage the recruitment pipeline stages

-- Create funnels table
CREATE TABLE IF NOT EXISTS funnels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create funnel_stages table
CREATE TABLE IF NOT EXISTS funnel_stages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    position INTEGER NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for UI
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(funnel_id, position)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_funnels_is_active ON funnels(is_active);
CREATE INDEX IF NOT EXISTS idx_funnel_stages_funnel_id ON funnel_stages(funnel_id);
CREATE INDEX IF NOT EXISTS idx_funnel_stages_position ON funnel_stages(funnel_id, position);

-- Enable RLS (Row Level Security)
ALTER TABLE funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_stages ENABLE ROW LEVEL SECURITY;

-- Create policies for funnels
CREATE POLICY "Users can view funnels" ON funnels
    FOR SELECT USING (true);

CREATE POLICY "Users can insert funnels" ON funnels
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update funnels" ON funnels
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete funnels" ON funnels
    FOR DELETE USING (true);

-- Create policies for funnel_stages
CREATE POLICY "Users can view funnel stages" ON funnel_stages
    FOR SELECT USING (true);

CREATE POLICY "Users can insert funnel stages" ON funnel_stages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update funnel stages" ON funnel_stages
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete funnel stages" ON funnel_stages
    FOR DELETE USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_funnels_updated_at 
    BEFORE UPDATE ON funnels 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_funnel_stages_updated_at 
    BEFORE UPDATE ON funnel_stages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default Pipeline funnel
INSERT INTO funnels (id, name, description) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Pipeline', 'Pipeline padrão de recrutamento')
ON CONFLICT (id) DO NOTHING;

-- Insert default stages for Pipeline funnel
INSERT INTO funnel_stages (funnel_id, name, description, position) VALUES
('00000000-0000-0000-0000-000000000001', 'Aplicação Recebida', 'Candidato aplicou para a vaga', 1),
('00000000-0000-0000-0000-000000000001', 'Triagem Inicial', 'Primeira avaliação dos candidatos', 2),
('00000000-0000-0000-0000-000000000001', 'Entrevista Técnica', 'Avaliação técnica do candidato', 3),
('00000000-0000-0000-0000-000000000001', 'Entrevista Final', 'Entrevista com gestor', 4),
('00000000-0000-0000-0000-000000000001', 'Aprovado', 'Candidato aprovado', 5),
('00000000-0000-0000-0000-000000000001', 'Rejeitado', 'Candidato rejeitado', 6)
ON CONFLICT (funnel_id, position) DO NOTHING;
