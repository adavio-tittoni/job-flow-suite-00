import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Save, Key, User, Mail, Image as ImageIcon, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Profile() {
  const { toast } = useToast();
  const { user, session, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    avatar_url: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        if (profile) {
          setFormData({
            name: profile.name || "",
            email: profile.email || "",
            avatar_url: profile.avatar_url || "",
          });
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar o perfil.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id, toast]);

  const handleSaveProfile = async () => {
    if (!user?.id) return;

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

    setSaving(true);

    try {
      // Atualizar perfil na tabela profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          name: formData.name,
          email: formData.email,
          avatar_url: formData.avatar_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Se o email mudou, atualizar também no auth.users
      let emailUpdateMessage = "";
      if (formData.email !== user.email && session?.user) {
        const { error: updateError } = await supabase.auth.updateUser({
          email: formData.email,
        });

        if (updateError) {
          console.warn("Erro ao atualizar email no auth:", updateError);
          emailUpdateMessage = " O email pode precisar de confirmação.";
        } else {
          emailUpdateMessage = " Verifique seu email para confirmar a alteração.";
        }
      }

      toast({
        title: "Sucesso",
        description: `Perfil atualizado com sucesso!${emailUpdateMessage}`,
      });

      // Atualizar o contexto de autenticação
      await refreshProfile();
    } catch (error: any) {
      console.error("Erro ao salvar perfil:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar o perfil.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A nova senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    setResettingPassword(true);

    try {
      // Verificar senha atual se fornecida
      if (passwordData.currentPassword && session?.user?.email) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: session.user.email,
          password: passwordData.currentPassword,
        });

        if (signInError) {
          toast({
            title: "Erro",
            description: "Senha atual incorreta.",
            variant: "destructive",
          });
          setResettingPassword(false);
          return;
        }
      }

      // Atualizar senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (updateError) throw updateError;

      toast({
        title: "Sucesso",
        description: "Senha alterada com sucesso!",
      });

      // Limpar campos de senha
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      console.error("Erro ao alterar senha:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível alterar a senha.",
        variant: "destructive",
      });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleSendPasswordResetEmail = async () => {
    if (!user?.email) {
      toast({
        title: "Erro",
        description: "Email não encontrado.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;

      toast({
        title: "Email enviado",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
    } catch (error: any) {
      console.error("Erro ao enviar email de reset:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar o email de redefinição.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground">
          Gerencie suas informações pessoais e configurações de conta
        </p>
      </div>

      <div className="grid gap-6">
        {/* Informações do Perfil */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações Pessoais
            </CardTitle>
            <CardDescription>
              Atualize suas informações pessoais. O email será usado para login.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  <User className="inline h-4 w-4 mr-2" />
                  Nome completo *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Seu nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="inline h-4 w-4 mr-2" />
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar_url">
                <ImageIcon className="inline h-4 w-4 mr-2" />
                URL do Avatar
              </Label>
              <Input
                id="avatar_url"
                type="url"
                value={formData.avatar_url}
                onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                placeholder="https://exemplo.com/avatar.jpg"
              />
              <p className="text-xs text-muted-foreground">
                URL da imagem do seu perfil (opcional)
              </p>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar alterações
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Alteração de Senha */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Alterar Senha
            </CardTitle>
            <CardDescription>
              Altere sua senha de acesso ou solicite um link de redefinição por email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha Atual (opcional)</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                  placeholder="Digite sua senha atual"
                />
                <p className="text-xs text-muted-foreground">
                  Opcional: forneça sua senha atual para maior segurança
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha *</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, newPassword: e.target.value })
                    }
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                    placeholder="Digite a senha novamente"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">Redefinir senha por email</p>
                <p className="text-xs text-muted-foreground">
                  Receba um link seguro para redefinir sua senha
                </p>
              </div>
              <Button variant="outline" onClick={handleSendPasswordResetEmail}>
                Enviar email de redefinição
              </Button>
            </div>

            <div className="flex justify-end pt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="default" disabled={resettingPassword || !passwordData.newPassword}>
                    {resettingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Alterando...
                      </>
                    ) : (
                      <>
                        <Key className="mr-2 h-4 w-4" />
                        Alterar senha
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar alteração de senha</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja alterar sua senha? Você precisará fazer login novamente
                      com a nova senha.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetPassword}>
                      Confirmar alteração
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        {/* Informações da Conta */}
        {user && (
          <Card>
            <CardHeader>
              <CardTitle>Informações da Conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Função</Label>
                  <p className="text-sm text-muted-foreground capitalize">
                    {user.role || "Não definida"}
                  </p>
                </div>
                <div>
                  <Label>ID do Usuário</Label>
                  <p className="text-sm text-muted-foreground font-mono text-xs">
                    {user.id}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

