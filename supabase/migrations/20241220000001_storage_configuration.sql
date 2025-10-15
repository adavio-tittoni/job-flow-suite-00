-- Storage configuration for candidate management system
-- This file contains the SQL commands to create and configure storage buckets

-- Create storage buckets for candidate photos and documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('candidate-photos', 'candidate-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    ('candidate-documents', 'candidate-documents', false, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create storage policies for candidate-photos bucket
CREATE POLICY "Anyone can view candidate photos" ON storage.objects
    FOR SELECT USING (bucket_id = 'candidate-photos');

CREATE POLICY "Authenticated users can upload candidate photos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'candidate-photos' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can update candidate photos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'candidate-photos' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can delete candidate photos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'candidate-photos' 
        AND auth.role() = 'authenticated'
    );

-- Create storage policies for candidate-documents bucket
CREATE POLICY "Authenticated users can view candidate documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'candidate-documents' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can upload candidate documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'candidate-documents' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can update candidate documents" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'candidate-documents' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can delete candidate documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'candidate-documents' 
        AND auth.role() = 'authenticated'
    );

-- Create a function to automatically create user profile and role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user profile
    INSERT INTO public.profiles (user_id, name, email)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NEW.email);
    
    -- Create user role (default to 'recrutador')
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'recrutador');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile and role on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM public.user_roles 
        WHERE user_roles.user_id = get_user_role.user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role IN ('superadministrador', 'administrador')
        FROM public.user_roles 
        WHERE user_roles.user_id = is_admin.user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get candidate adherence status
CREATE OR REPLACE FUNCTION public.get_candidate_adherence(candidate_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    WITH candidate_matrix AS (
        SELECT matrix_id FROM candidates WHERE id = candidate_id
    ),
    matrix_requirements AS (
        SELECT 
            mi.id as requirement_id,
            mi.document_id,
            mi.obrigatoriedade,
            mi.carga_horaria,
            dc.name as document_name,
            dc.group_name,
            dc.document_category
        FROM matrix_items mi
        JOIN documents_catalog dc ON mi.document_id = dc.id
        WHERE mi.matrix_id = (SELECT matrix_id FROM candidate_matrix)
    ),
    candidate_docs AS (
        SELECT 
            cd.id,
            cd.document_name,
            cd.group_name,
            cd.catalog_document_id,
            cd.expiry_date,
            cd.carga_horaria_total,
            cd.detail
        FROM candidate_documents cd
        WHERE cd.candidate_id = get_candidate_adherence.candidate_id
    ),
    adherence_calc AS (
        SELECT 
            mr.requirement_id,
            mr.document_id,
            mr.document_name,
            mr.group_name,
            mr.required_hours,
            COALESCE(cd.carga_horaria_total, 0) as actual_hours,
            CASE 
                WHEN cd.id IS NULL THEN 'pending'
                WHEN mr.carga_horaria IS NOT NULL AND COALESCE(cd.carga_horaria_total, 0) < mr.carga_horaria THEN 'partial'
                ELSE 'fulfilled'
            END as status,
            CASE 
                WHEN cd.id IS NULL THEN 'Documento ausente'
                WHEN mr.carga_horaria IS NOT NULL AND COALESCE(cd.carga_horaria_total, 0) < mr.carga_horaria THEN 'Horas insuficientes'
                ELSE 'Requisito atendido'
            END as observation
        FROM matrix_requirements mr
        LEFT JOIN candidate_docs cd ON cd.catalog_document_id = mr.document_id
    )
    SELECT json_build_object(
        'overall', json_build_object(
            'total', COUNT(*),
            'fulfilled', COUNT(*) FILTER (WHERE status = 'fulfilled'),
            'partial', COUNT(*) FILTER (WHERE status = 'partial'),
            'pending', COUNT(*) FILTER (WHERE status = 'pending'),
            'adherencePercentage', ROUND(
                (COUNT(*) FILTER (WHERE status = 'fulfilled')::FLOAT / COUNT(*)) * 100
            )
        ),
        'departments', json_agg(
            json_build_object(
                'name', group_name,
                'total', COUNT(*),
                'fulfilled', COUNT(*) FILTER (WHERE status = 'fulfilled'),
                'partial', COUNT(*) FILTER (WHERE status = 'partial'),
                'pending', COUNT(*) FILTER (WHERE status = 'pending'),
                'adherencePercentage', ROUND(
                    (COUNT(*) FILTER (WHERE status = 'fulfilled')::FLOAT / COUNT(*)) * 100
                )
            )
        )
    ) INTO result
    FROM adherence_calc
    GROUP BY group_name;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance on storage operations
CREATE INDEX IF NOT EXISTS idx_storage_objects_bucket_id ON storage.objects(bucket_id);
CREATE INDEX IF NOT EXISTS idx_storage_objects_name ON storage.objects(name);
CREATE INDEX IF NOT EXISTS idx_storage_objects_owner ON storage.objects(owner);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT SELECT ON storage.buckets TO authenticated;
