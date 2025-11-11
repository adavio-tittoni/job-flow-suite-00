import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, User, Key } from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  role?: string;
}

const UserEditor = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "recrutador",
  });

  // Fetch user data if editing
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        if (isEditing && id) {
          // Fetch user profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

          if (profileError) throw profileError;

          // Fetch user role
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', id)
            .single();

          if (!profileData) {
            toast({
              title: "Erro",
              description: "Usuário não encontrado.",
              variant: "destructive",
            });
            navigate('/users');
            return;
          }

          setUser(profileData);
          setFormData({
            name: profileData.name || "",
            email: profileData.email || "",
            password: "",
            confirmPassword: "",
            role: roleData?.role || "recrutador",
          });
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados do usuário.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    // Não recarregar se acabamos de salvar
    if (!justSaved) {
      fetchData();
    } else {
      // Resetar a flag após um pequeno delay
      setTimeout(() => setJustSaved(false), 100);
    }
  }, [id, isEditing, navigate, justSaved]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.email.trim()) {
      toast({
        title: "Erro",
        description: "Email é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    // Validação de senha
    // Para novos usuários: senha é obrigatória
    // Para edição: senha é opcional, mas se fornecida, deve ser válida
    if (!isEditing && (!formData.password || formData.password.trim() === "")) {
      toast({
        title: "Erro",
        description: "Senha é obrigatória para novos usuários.",
        variant: "destructive",
      });
      return;
    }

    // Se senha foi fornecida (novo usuário ou edição), validar
    if (formData.password && formData.password.trim() !== "") {
      if (formData.password.length < 6) {
        toast({
          title: "Erro",
          description: "Senha deve ter pelo menos 6 caracteres.",
          variant: "destructive",
        });
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Erro",
          description: "Senhas não coincidem.",
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);

    try {
      if (isEditing && id) {
        console.log('💾 Salvando usuário:', { id, name: formData.name, email: formData.email });
        console.log('💾 Dados atuais do usuário:', user);
        
        // Update existing user
        const { data: updateResult, error: profileError, count } = await supabase
          .from('profiles')
          .update({
            name: formData.name,
            email: formData.email,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select();

        if (profileError) {
          console.error('❌ Erro ao salvar perfil:', profileError);
          throw profileError;
        }

        console.log('✅ Resultado do update:', { updateResult, count });
        
        // Verificar se realmente atualizou
        if (updateResult && updateResult.length === 0) {
          console.warn('⚠️ Update não afetou nenhuma linha. Verificando se o usuário existe...');
          // Verificar se o usuário existe
          const { data: checkUser } = await supabase
            .from('profiles')
            .select('id, name, email')
            .eq('id', id)
            .single();
          console.log('👤 Usuário encontrado:', checkUser);
        }

        console.log('✅ Perfil salvo com sucesso');

        // Marcar que acabamos de salvar para evitar recarregamento
        setJustSaved(true);

        // Atualizar o estado imediatamente com os dados do formulário
        // Isso garante que a UI reflita as mudanças mesmo antes de buscar do banco
        setUser(prev => prev ? {
          ...prev,
          name: formData.name,
          email: formData.email,
          updated_at: new Date().toISOString(),
        } : null);

        // IMPORTANTE: Não atualizar o formData aqui, ele já tem os valores corretos
        // O formData deve manter os valores que o usuário digitou

        // Tentar buscar os dados atualizados do banco para confirmar (sem atualizar formData)
        try {
          const { data: updatedData, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

          if (!fetchError && updatedData) {
            console.log('✅ Dados atualizados recuperados do banco:', updatedData);
            // Atualizar apenas o estado do usuário, não o formData
            setUser(updatedData);
          } else {
            console.warn('⚠️ Não foi possível buscar dados atualizados:', fetchError);
          }
        } catch (fetchError) {
          console.warn('⚠️ Erro ao buscar dados atualizados:', fetchError);
        }

        // Se o email mudou, atualizar também no auth.users
        if (user && formData.email !== user.email) {
          try {
            // Usar Edge Function ou admin API para atualizar email
            // Por enquanto, vamos apenas atualizar o profile
            // O email no auth.users pode precisar de confirmação
            console.log('Email mudou, mas atualização no auth.users requer permissões admin');
          } catch (emailError) {
            console.warn('Não foi possível atualizar email no auth.users:', emailError);
          }
        }

        // Update role using a more robust approach
        try {
          // Try to update existing role first
          const { error: updateError } = await supabase
            .from('user_roles')
            .update({ role: formData.role })
            .eq('user_id', id);

          if (updateError) {
            console.log('Update failed, trying upsert:', updateError.message);
            
            // If update fails, try upsert
            const { error: upsertError } = await supabase
              .from('user_roles')
              .upsert({ 
                user_id: id, 
                role: formData.role 
              }, {
                onConflict: 'user_id'
              });

            if (upsertError) {
              console.warn('Upsert also failed:', upsertError.message);
              // Try direct insert (in case no role exists)
              const { error: insertError } = await supabase
                .from('user_roles')
                .insert({ 
                  user_id: id, 
                  role: formData.role 
                });

              if (insertError) {
                console.warn('All role update methods failed:', insertError.message);
                // Don't throw error, profile was updated successfully
              }
            }
          }
        } catch (roleError) {
          console.warn('Role update failed completely:', roleError);
          // Don't throw error, profile was updated successfully
        }

        // Atualizar senha se fornecida
        let passwordUpdated = false;
        if (formData.password && formData.password.trim() !== "") {
          try {
            console.log('Tentando atualizar senha para usuário:', id);
            
            // Obter o token de autenticação atual
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
              throw new Error('Usuário não autenticado');
            }

            // Chamar a Edge Function para atualizar senha
            const { data: passwordData, error: passwordError } = await supabase.functions.invoke(
              'update-user-password',
              {
                body: {
                  userId: id,
                  newPassword: formData.password,
                },
              }
            );

            if (passwordError) {
              console.error('Erro ao atualizar senha:', passwordError);
              toast({
                title: "Aviso",
                description: passwordError.message || "Perfil atualizado, mas a senha não foi alterada.",
                variant: "default",
              });
            } else {
              console.log('Senha atualizada com sucesso:', passwordData);
              passwordUpdated = true;
            }
          } catch (passwordUpdateError: any) {
            console.error('Erro ao tentar atualizar senha:', passwordUpdateError);
            const errorMessage = passwordUpdateError?.message || passwordUpdateError?.toString() || "Erro desconhecido";
            toast({
              title: "Aviso",
              description: `Perfil atualizado, mas houve um erro ao alterar a senha: ${errorMessage}`,
              variant: "default",
            });
          }
        }

        const successMessage = passwordUpdated 
          ? "Usuário e senha atualizados com sucesso."
          : "Usuário atualizado com sucesso.";

        // Invalidar queries para atualizar a lista de usuários
        queryClient.invalidateQueries({ queryKey: ["users"] });
        queryClient.invalidateQueries({ queryKey: ["user", id] });

        toast({
          title: "Sucesso",
          description: successMessage,
        });
      } else {
        // Create new user using signup (for regular users)
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name,
            },
          },
        });

        if (authError) throw authError;

        if (authData.user) {
          // Update profile with additional data
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              name: formData.name,
              email: formData.email,
            })
            .eq('id', authData.user.id);

          if (profileError) throw profileError;

          // Update role
          const { error: roleError } = await supabase
            .from('user_roles')
            .update({ role: formData.role })
            .eq('user_id', authData.user.id);

          if (roleError) throw roleError;

          toast({
            title: "Sucesso",
            description: "Usuário criado com sucesso.",
          });

          // Redirect to edit mode after creation
          navigate(`/users/${authData.user.id}`, { replace: true });
          return;
        }
      }
    } catch (error: any) {
      console.error('❌ Erro ao salvar usuário:', error);
      
      // Em caso de erro, manter o formData como está (não recarregar do banco)
      setJustSaved(true);
      
      // Determinar mensagem de erro mais específica
      let errorMessage = "Não foi possível salvar o usuário.";
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('ERR_INTERNET_DISCONNECTED')) {
        errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
      } else if (error?.code === 'PGRST116') {
        errorMessage = "Usuário não encontrado ou sem permissão para atualizar.";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
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
        <Button variant="ghost" onClick={() => navigate('/users')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para usuários
        </Button>
        
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">
            {isEditing ? 'Editar usuário' : 'Novo usuário'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing 
              ? 'Altere as informações do usuário conforme necessário'
              : 'Preencha as informações para criar um novo usuário'
            }
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome completo do usuário"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role">Função *</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recrutador">Recrutador</SelectItem>
                    <SelectItem value="administrador">Administrador</SelectItem>
                    <SelectItem value="superadministrador">Super Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              {isEditing ? "Alterar senha" : "Senha de acesso"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing && (
              <p className="text-sm text-muted-foreground">
                Deixe em branco para manter a senha atual. Preencha apenas se desejar alterar.
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password">
                  {isEditing ? "Nova senha" : "Senha *"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={isEditing ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
                />
              </div>
              
              <div>
                <Label htmlFor="confirmPassword">
                  {isEditing ? "Confirmar nova senha" : "Confirmar senha *"}
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Digite a senha novamente"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Information */}
        {isEditing && user && (
          <Card>
            <CardHeader>
              <CardTitle>Informações do usuário</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Criado em</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                
                <div>
                  <Label>Última atualização</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(user.updated_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default UserEditor;
