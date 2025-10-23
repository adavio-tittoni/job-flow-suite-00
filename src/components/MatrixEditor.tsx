import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Users, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MatrixItemsTable } from "@/components/MatrixItemsTable";

interface Matrix {
  id: string;
  empresa: string;
  cargo: string;
  versao_matriz: string;
  solicitado_por: string;
  user_email: string;
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export const MatrixEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    empresa: "",
    cargo: "",
    solicitado_por: "",
    versao_matriz: "",
    user_email: "",
  });

  // Load matrix data
  useEffect(() => {
    const loadMatrix = async () => {
      if (!id) return;
      
      try {
        const { data: matrixData, error: matrixError } = await supabase
          .from('matrices')
          .select('*')
          .eq('id', id)
          .single();

        if (matrixError) throw matrixError;

        if (matrixData) {
          setMatrix(matrixData);
          setFormData({
            empresa: matrixData.empresa || "",
            cargo: matrixData.cargo || "",
            solicitado_por: matrixData.solicitado_por || "",
            versao_matriz: matrixData.versao_matriz || "",
            user_email: matrixData.user_email || "",
          });
        }
      } catch (error: any) {
        toast({
          title: "Erro ao carregar matriz",
          description: error.message || "Não foi possível carregar os dados da matriz.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadMatrix();
  }, [id, toast]);

  // Load users for the select
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, email')
          .order('name');

        if (!error && data) {
          setUsers(data);
        }
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };

    loadUsers();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('matrices')
        .update(formData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Matriz atualizada",
        description: "As informações da matriz foram atualizadas com sucesso.",
      });

      // Update local state
      setMatrix(prev => prev ? { ...prev, ...formData } : null);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Ocorreu um erro ao salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    navigate('/matrix');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <p>Carregando matriz...</p>
        </div>
      </div>
    );
  }

  if (!matrix) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Matriz não encontrada</h2>
          <Button onClick={handleBack}>
            Voltar para lista
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleBack} className="hover:bg-white/50">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-blue-900">
                    Editar Matriz
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                      {matrix.empresa} - {matrix.cargo}
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-white">
                      v{matrix.versao_matriz}
                    </Badge>
                  </div>
                </div>
              </div>
              <p className="text-sm text-blue-700 font-medium ml-12">
                📋 Edite a matriz e seus documentos associados
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </div>

      {/* Matrix Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Informações da Matriz
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="empresa" className="font-semibold">Empresa *</Label>
              <Input
                id="empresa"
                value={formData.empresa}
                onChange={(e) => handleInputChange('empresa', e.target.value)}
                placeholder="Nome da empresa"
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cargo" className="font-semibold">Cargo *</Label>
              <Input
                id="cargo"
                value={formData.cargo}
                onChange={(e) => handleInputChange('cargo', e.target.value)}
                placeholder="Nome do cargo"
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="solicitado_por" className="font-semibold">Solicitado por *</Label>
              <Input
                id="solicitado_por"
                value={formData.solicitado_por}
                onChange={(e) => handleInputChange('solicitado_por', e.target.value)}
                placeholder="Nome de quem solicitou"
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="versao_matriz" className="font-semibold">Versão Matriz *</Label>
              <Input
                id="versao_matriz"
                value={formData.versao_matriz}
                onChange={(e) => handleInputChange('versao_matriz', e.target.value)}
                placeholder="Ex: 1.0"
                className="bg-white"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="user_email" className="font-semibold">Email do Usuário</Label>
              <Select
                value={formData.user_email}
                onValueChange={(value) => handleInputChange('user_email', value)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Selecionar usuário" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.email}>
                      <div className="flex flex-col">
                        <span>{user.name}</span>
                        <span className="text-sm text-gray-500">{user.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matrix Items Table */}
      <MatrixItemsTable matrixId={id!} />
    </div>
  );
};
