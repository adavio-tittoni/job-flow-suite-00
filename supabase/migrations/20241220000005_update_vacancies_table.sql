-- Migration: Update vacancies table to include missing fields
-- Add fields that are used in the vacancy system but missing from the current schema

-- Add missing columns to vacancies table
ALTER TABLE vacancies 
ADD COLUMN IF NOT EXISTS company VARCHAR(255),
ADD COLUMN IF NOT EXISTS role_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS matrix_id UUID REFERENCES matrices(id),
ADD COLUMN IF NOT EXISTS funnel_id UUID REFERENCES funnels(id),
ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES funnel_stages(id),
ADD COLUMN IF NOT EXISTS salary DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS candidates_count INTEGER DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vacancies_funnel_id ON vacancies(funnel_id);
CREATE INDEX IF NOT EXISTS idx_vacancies_stage_id ON vacancies(stage_id);
CREATE INDEX IF NOT EXISTS idx_vacancies_matrix_id ON vacancies(matrix_id);
CREATE INDEX IF NOT EXISTS idx_vacancies_company ON vacancies(company);
CREATE INDEX IF NOT EXISTS idx_vacancies_due_date ON vacancies(due_date);

-- Add trigger for updated_at if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_vacancies_updated_at') THEN
        CREATE TRIGGER update_vacancies_updated_at 
            BEFORE UPDATE ON vacancies 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Update existing vacancies to have default funnel and stage
UPDATE vacancies 
SET 
    funnel_id = '00000000-0000-0000-0000-000000000001',
    stage_id = (SELECT id FROM funnel_stages WHERE funnel_id = '00000000-0000-0000-0000-000000000001' AND position = 1 LIMIT 1)
WHERE funnel_id IS NULL OR stage_id IS NULL;
