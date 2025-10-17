-- Migration: Add missing fields to vacancies table
-- This migration adds the necessary fields for the vacancy system

-- Add missing columns to vacancies table if they don't exist
DO $$ 
BEGIN
    -- Add company field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vacancies' AND column_name = 'company') THEN
        ALTER TABLE vacancies ADD COLUMN company VARCHAR(255);
    END IF;
    
    -- Add role_title field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vacancies' AND column_name = 'role_title') THEN
        ALTER TABLE vacancies ADD COLUMN role_title VARCHAR(255);
    END IF;
    
    -- Add matrix_id field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vacancies' AND column_name = 'matrix_id') THEN
        ALTER TABLE vacancies ADD COLUMN matrix_id UUID REFERENCES matrices(id);
    END IF;
    
    -- Add salary field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vacancies' AND column_name = 'salary') THEN
        ALTER TABLE vacancies ADD COLUMN salary DECIMAL(10,2);
    END IF;
    
    -- Add due_date field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vacancies' AND column_name = 'due_date') THEN
        ALTER TABLE vacancies ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add notes field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vacancies' AND column_name = 'notes') THEN
        ALTER TABLE vacancies ADD COLUMN notes TEXT;
    END IF;
    
    -- Add candidates_count field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vacancies' AND column_name = 'candidates_count') THEN
        ALTER TABLE vacancies ADD COLUMN candidates_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vacancies_matrix_id ON vacancies(matrix_id);
CREATE INDEX IF NOT EXISTS idx_vacancies_company ON vacancies(company);
CREATE INDEX IF NOT EXISTS idx_vacancies_due_date ON vacancies(due_date);
CREATE INDEX IF NOT EXISTS idx_vacancies_candidates_count ON vacancies(candidates_count);
