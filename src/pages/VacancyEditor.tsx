import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Save, Users } from "lucide-react";
import VacancyCandidatesSection from "@/components/VacancyCandidatesSection";

interface Matrix {
  id: string;
  empresa: string;
  cargo: string;
  versao_matriz: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface Vacancy {
  id: string;
  title: string;
  company?: string;
  role_title?: string;
  matrix_id?: string;
  salary?: number;
  due_date?: string;
  location?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  status: string;
  department?: string;
  description?: string;
  employment_type?: string;
  requirements?: string;
  salary_range?: string;
  closed_at?: string;
  recruiter_id?: string;
}


const VacancyEditor = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isEditing = !!id;

  // Get active tab from URL or set default
  const activeTab = searchParams.get('tab') || (isEditing ? 'candidatos' : 'informacoes');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [matrices, setMatrices] = useState<Matrix[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    company: "",
    role_title: "",
    matrix_id: "",
    recruiter_id: "",
    salary: "",
    due_date: "",
    location: "",
    notes: "",
  });

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch matrices
        const { data: matricesData, error: matricesError } = await supabase
          .from('matrices')
          .select('*')
          .order('created_at', { ascending: false });

        if (matricesError) throw matricesError;
        setMatrices(matricesData || []);

        // Fetch users (all users for recruiter assignment)
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select(`
            id,
            name,
            email
          `)
          .order('name');

        if (usersError) throw usersError;

        // Fetch roles for each user
        const usersWithRoles = await Promise.all(
          (usersData || []).map(async (profile) => {
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', profile.id)
              .single();

            return {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              role: roleData?.role || 'recrutador'
            };
          })
        );

        // Filter only users with recruiter, admin or superadmin roles
        const recruiterUsers = usersWithRoles.filter(user => 
          ['recrutador', 'administrador', 'superadministrador'].includes(user.role)
        );

        setUsers(recruiterUsers);

        if (isEditing && id) {
          // Fetch existing vacancy
          const { data: vacancyData, error: vacancyError } = await supabase
            .from('vacancies')
            .select('*')
            .eq('id', id)
            .single();

          if (vacancyError) throw vacancyError;
          if (!vacancyData) {
            toast({
              title: "Erro",
              description: "Vaga não encontrada.",
              variant: "destructive",
            });
            navigate('/vacancies');
            return;
          }

          setVacancy(vacancyData);
          setFormData({
            title: vacancyData.title || "",
            company: (vacancyData as any).company || "",
            role_title: (vacancyData as any).role_title || "",
            matrix_id: (vacancyData as any).matrix_id || "none",
            recruiter_id: (vacancyData as any).recruiter_id || "",
            salary: (vacancyData as any).salary ? (vacancyData as any).salary.toString() : "",
            due_date: (vacancyData as any).due_date ? (vacancyData as any).due_date.split('T')[0] : "",
            location: vacancyData.location || "",
            notes: (vacancyData as any).notes || "",
          });
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isEditing, navigate, toast]);

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Erro",
        description: "Título da vaga é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.recruiter_id) {
      toast({
        title: "Erro",
        description: "Recrutador responsável é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const vacancyPayload = {
        title: formData.title,
        company: formData.company || null,
        role_title: formData.role_title || null,
        matrix_id: formData.matrix_id === "none" || !formData.matrix_id ? null : formData.matrix_id,
        recruiter_id: formData.recruiter_id || null,
        salary: formData.salary ? parseFloat(formData.salary) : null,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
        location: formData.location || null,
        notes: formData.notes || null,
        created_by: user?.id || 'system',
      };

      if (isEditing && id) {
        const { error } = await supabase
          .from('vacancies')
          .update(vacancyPayload)
          .eq('id', id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Vaga atualizada com sucesso.",
        });
      } else {
        const { data, error } = await supabase
          .from('vacancies')
          .insert(vacancyPayload)
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Vaga criada com sucesso.",
        });

        // Redirect to edit mode after creation
        navigate(`/vacancies/${data.id}`, { replace: true });
        return;
      }
    } catch (error) {
      console.error('Erro ao salvar vaga:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a vaga.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => navigate('/vacancies')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para vagas
        </Button>
        
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">
            {isEditing ? 'Editar vaga' : 'Nova vaga'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing 
              ? 'Altere as informações da vaga conforme necessário'
              : 'Preencha as informações para criar uma nova vaga'
            }
          </p>
        </div>

        {activeTab === 'informacoes' && (
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        )}
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={(value) => setSearchParams({ tab: value })}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="candidatos" disabled={!isEditing}>
            Candidatos
          </TabsTrigger>
          <TabsTrigger value="informacoes">
            Informações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="candidatos" className="mt-6">
          {isEditing && id ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Candidatos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VacancyCandidatesSection 
                  vacancyId={id} 
                  matrixId={formData.matrix_id === "none" ? null : formData.matrix_id} 
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center">
                  Salve a vaga primeiro para gerenciar candidatos.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="informacoes" className="mt-6">
          <div className="grid gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Informações básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ex: Desenvolvedor Frontend"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="company">Empresa</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Nome da empresa"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="role_title">Cargo</Label>
                    <Input
                      id="role_title"
                      value={formData.role_title}
                      onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
                      placeholder="Ex: Desenvolvedor Pleno"
                    />
                  </div>

                  <div>
                    <Label htmlFor="matrix">Matriz</Label>
                    <Select value={formData.matrix_id} onValueChange={(value) => setFormData({ ...formData, matrix_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Vincular matriz existente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma matriz</SelectItem>
                        {matrices.map((matrix) => (
                          <SelectItem key={matrix.id} value={matrix.id}>
                            {matrix.empresa} - {matrix.cargo} {matrix.versao_matriz && `(${matrix.versao_matriz})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recruiter Assignment */}
            <Card>
              <CardHeader>
                <CardTitle>Recrutador Responsável</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="recruiter">Recrutador *</Label>
                    <Select value={formData.recruiter_id} onValueChange={(value) => setFormData({ ...formData, recruiter_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o recrutador responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Details */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhes adicionais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="salary">Salário (R$)</Label>
                    <Input
                      id="salary"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                      placeholder="5000.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="due_date">Prazo</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="location">Localização</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Ex: São Paulo - SP / Remoto"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Informações adicionais sobre a vaga..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default VacancyEditor;
