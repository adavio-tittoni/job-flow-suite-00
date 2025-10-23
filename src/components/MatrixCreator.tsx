import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, FileText, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MatrixItemsTable } from "@/components/MatrixItemsTable";

interface User {
  id: string;
  name: string;
  email: string;
}

export const MatrixCreator = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [users, setUsers] = useState<User[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [createdMatrixId, setCreatedMatrixId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    empresa: "",
    cargo: "",
    solicitado_por: "",
    versao_matriz: "1",
    user_email: "",
  });

  // Load users for the select
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
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
    // Validate required fields
    if (!formData.empresa || !formData.cargo || !formData.solicitado_por || !formData.versao_matriz) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('matrices')
        .insert([{
          ...formData,
          created_by: user?.id,
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Matriz criada",
        description: "A matriz foi criada com sucesso.",
      });

      setCreatedMatrixId(data.id);
    } catch (error: any) {
      toast({
        title: "Erro ao criar matriz",
        description: error.message || "Ocorreu um erro ao criar a matriz.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    navigate('/matrix');
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleBack} className="hover:bg-white/50">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Plus className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-green-900">
                    Nova Matriz
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                      Criando nova matriz de documentos
                    </Badge>
                  </div>
                </div>
              </div>
              <p className="text-sm text-green-700 font-medium ml-12">
                📋 Crie uma nova matriz e configure seus documentos associados
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <Button 
              onClick={handleSave}
              disabled={isSaving || createdMatrixId !== null}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Criando..." : createdMatrixId ? "Matriz Criada" : "Criar Matriz"}
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
                disabled={createdMatrixId !== null}
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
                disabled={createdMatrixId !== null}
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
                disabled={createdMatrixId !== null}
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
                disabled={createdMatrixId !== null}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="user_email" className="font-semibold">Email do Usuário</Label>
              <Select
                value={formData.user_email}
                onValueChange={(value) => handleInputChange('user_email', value)}
                disabled={createdMatrixId !== null}
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

      {/* Matrix Items Table - Only show after matrix is created */}
      {createdMatrixId && (
        <MatrixItemsTable matrixId={createdMatrixId} />
      )}
    </div>
  );
};
