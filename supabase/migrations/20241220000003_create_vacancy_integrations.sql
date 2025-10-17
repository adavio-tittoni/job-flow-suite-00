-- Migration: Create vacancy_integrations table
-- This table stores integration configurations for vacancies (Google Drive, Microsoft 365, etc.)

CREATE TABLE IF NOT EXISTS vacancy_integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vacancy_id UUID NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('google_drive', 'microsoft_365')),
    folder_id VARCHAR(255) NOT NULL,
    folder_name VARCHAR(255) NOT NULL,
    folder_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vacancy_integrations_vacancy_id ON vacancy_integrations(vacancy_id);
CREATE INDEX IF NOT EXISTS idx_vacancy_integrations_provider ON vacancy_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_vacancy_integrations_is_active ON vacancy_integrations(is_active);

-- Enable RLS (Row Level Security)
ALTER TABLE vacancy_integrations ENABLE ROW LEVEL SECURITY;

-- Create policies for vacancy_integrations
CREATE POLICY "Users can view vacancy integrations" ON vacancy_integrations
    FOR SELECT USING (true);

CREATE POLICY "Users can insert vacancy integrations" ON vacancy_integrations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update vacancy integrations" ON vacancy_integrations
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete vacancy integrations" ON vacancy_integrations
    FOR DELETE USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_vacancy_integrations_updated_at 
    BEFORE UPDATE ON vacancy_integrations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
