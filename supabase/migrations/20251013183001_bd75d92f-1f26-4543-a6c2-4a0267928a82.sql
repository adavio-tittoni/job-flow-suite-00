-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('superadministrador', 'administrador', 'recrutador');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Novo Usuário'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create vacancies table
CREATE TABLE public.vacancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  department TEXT,
  location TEXT,
  employment_type TEXT,
  salary_range TEXT,
  requirements TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- Create candidates table
CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  linkedin_url TEXT,
  resume_url TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create pipeline stages table
CREATE TABLE public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default pipeline stages
INSERT INTO public.pipeline_stages (name, description, order_index) VALUES
  ('Triagem', 'Análise inicial de currículos', 1),
  ('Entrevista RH', 'Entrevista com Recursos Humanos', 2),
  ('Teste Técnico', 'Avaliação técnica', 3),
  ('Entrevista Gestor', 'Entrevista com gestor da área', 4),
  ('Proposta', 'Envio de proposta', 5),
  ('Contratado', 'Candidato contratado', 6);

-- Create applications table (links candidates to vacancies)
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id UUID REFERENCES public.vacancies(id) ON DELETE CASCADE NOT NULL,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL,
  stage_id UUID REFERENCES public.pipeline_stages(id),
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(vacancy_id, candidate_id)
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create evaluation matrix table
CREATE TABLE public.evaluation_matrices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id UUID REFERENCES public.vacancies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create evaluation criteria table
CREATE TABLE public.evaluation_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_id UUID REFERENCES public.evaluation_matrices(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  weight INTEGER NOT NULL DEFAULT 1,
  max_score INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create evaluations table
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  criteria_id UUID REFERENCES public.evaluation_criteria(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL,
  notes TEXT,
  evaluated_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(application_id, criteria_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_matrices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated 
  USING (has_role(auth.uid(), 'superadministrador'));
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

-- RLS Policies for vacancies
CREATE POLICY "Authenticated users can view vacancies" ON public.vacancies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and recruiters can create vacancies" ON public.vacancies FOR INSERT TO authenticated 
  WITH CHECK (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'superadministrador') OR has_role(auth.uid(), 'recrutador'));
CREATE POLICY "Admins and recruiters can update vacancies" ON public.vacancies FOR UPDATE TO authenticated 
  USING (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'superadministrador') OR has_role(auth.uid(), 'recrutador'));
CREATE POLICY "Admins can delete vacancies" ON public.vacancies FOR DELETE TO authenticated 
  USING (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'superadministrador'));

-- RLS Policies for candidates
CREATE POLICY "Authenticated users can view candidates" ON public.candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Recruiters can manage candidates" ON public.candidates FOR ALL TO authenticated 
  USING (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'superadministrador') OR has_role(auth.uid(), 'recrutador'));

-- RLS Policies for pipeline_stages
CREATE POLICY "Everyone can view stages" ON public.pipeline_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can manage stages" ON public.pipeline_stages FOR ALL TO authenticated 
  USING (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'superadministrador'));

-- RLS Policies for applications
CREATE POLICY "Authenticated users can view applications" ON public.applications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Recruiters can manage applications" ON public.applications FOR ALL TO authenticated 
  USING (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'superadministrador') OR has_role(auth.uid(), 'recrutador'));

-- RLS Policies for documents
CREATE POLICY "Authenticated users can view documents" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Recruiters can manage documents" ON public.documents FOR ALL TO authenticated 
  USING (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'superadministrador') OR has_role(auth.uid(), 'recrutador'));

-- RLS Policies for evaluation_matrices
CREATE POLICY "Authenticated users can view matrices" ON public.evaluation_matrices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and recruiters can manage matrices" ON public.evaluation_matrices FOR ALL TO authenticated 
  USING (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'superadministrador') OR has_role(auth.uid(), 'recrutador'));

-- RLS Policies for evaluation_criteria
CREATE POLICY "Authenticated users can view criteria" ON public.evaluation_criteria FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and recruiters can manage criteria" ON public.evaluation_criteria FOR ALL TO authenticated 
  USING (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'superadministrador') OR has_role(auth.uid(), 'recrutador'));

-- RLS Policies for evaluations
CREATE POLICY "Authenticated users can view evaluations" ON public.evaluations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Recruiters can manage evaluations" ON public.evaluations FOR ALL TO authenticated 
  USING (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'superadministrador') OR has_role(auth.uid(), 'recrutador'));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vacancies_updated_at BEFORE UPDATE ON public.vacancies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evaluation_matrices_updated_at BEFORE UPDATE ON public.evaluation_matrices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();