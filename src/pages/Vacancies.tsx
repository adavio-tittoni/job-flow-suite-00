import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Vacancy {
  id: string;
  title: string;
  description: string;
  department: string;
  location: string;
  employment_type: string;
  status: string;
  created_at: string;
}

export default function Vacancies() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    department: "",
    location: "",
    employment_type: "full-time",
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchVacancies();
  }, []);

  const fetchVacancies = async () => {
    try {
      const { data, error } = await supabase
        .from("vacancies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVacancies(data || []);
    } catch (error) {
      toast({
        title: "Erro ao carregar vagas",
        description: "Não foi possível carregar as vagas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("vacancies")
        .insert([
          {
            ...formData,
            created_by: user.id,
            status: "open",
          },
        ]);

      if (error) throw error;

      toast({
        title: "Vaga criada!",
        description: "A vaga foi criada com sucesso.",
      });

      setOpen(false);
      setFormData({
        title: "",
        description: "",
        department: "",
        location: "",
        employment_type: "full-time",
      });
      fetchVacancies();
    } catch (error) {
      toast({
        title: "Erro ao criar vaga",
        description: "Não foi possível criar a vaga.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vagas</h1>
          <p className="text-muted-foreground">Gerencie as vagas abertas</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Vaga
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Nova Vaga</DialogTitle>
              <DialogDescription>
                Preencha as informações da vaga abaixo
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título da Vaga</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Departamento</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location">Localização</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="employment_type">Tipo de Contratação</Label>
                <Select
                  value={formData.employment_type}
                  onValueChange={(value) => setFormData({ ...formData, employment_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Tempo Integral</SelectItem>
                    <SelectItem value="part-time">Meio Período</SelectItem>
                    <SelectItem value="contract">Contrato</SelectItem>
                    <SelectItem value="internship">Estágio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Criar Vaga</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Carregando vagas...</p>
        </div>
      ) : vacancies.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Nenhuma vaga cadastrada ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {vacancies.map((vacancy) => (
            <Card key={vacancy.id}>
              <CardHeader>
                <CardTitle>{vacancy.title}</CardTitle>
                <CardDescription>
                  {vacancy.department && `${vacancy.department} • `}
                  {vacancy.location && `${vacancy.location} • `}
                  {vacancy.employment_type}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{vacancy.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
