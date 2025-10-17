-- Migration: Create vacancy_candidates table
-- This table links candidates to specific vacancies

CREATE TABLE IF NOT EXISTS vacancy_candidates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vacancy_id UUID NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(vacancy_id, candidate_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vacancy_candidates_vacancy_id ON vacancy_candidates(vacancy_id);
CREATE INDEX IF NOT EXISTS idx_vacancy_candidates_candidate_id ON vacancy_candidates(candidate_id);

-- Enable RLS (Row Level Security)
ALTER TABLE vacancy_candidates ENABLE ROW LEVEL SECURITY;

-- Create policies for vacancy_candidates
CREATE POLICY "Users can view vacancy candidates" ON vacancy_candidates
    FOR SELECT USING (true);

CREATE POLICY "Users can insert vacancy candidates" ON vacancy_candidates
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update vacancy candidates" ON vacancy_candidates
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete vacancy candidates" ON vacancy_candidates
    FOR DELETE USING (true);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vacancy_candidates_updated_at 
    BEFORE UPDATE ON vacancy_candidates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
