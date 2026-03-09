import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { HelpCircle, Edit, Save, X, Loader2 } from "lucide-react";

export default function Help() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState("");
  const [helpId, setHelpId] = useState<string | null>(null);

  const isAdmin = user?.role === "administrador" || user?.role === "superadministrador";

  useEffect(() => {
    fetchHelpContent();
  }, []);

  const fetchHelpContent = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("help_content")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "no rows returned", which is fine for first time
        throw error;
      }

      if (data) {
        setContent(data.content || "");
        setHelpId(data.id);
      } else {
        // If no content exists, create default
        const { data: newData, error: insertError } = await supabase
          .from("help_content")
          .insert({ content: "" })
          .select()
          .single();

        if (insertError) {
          console.error("Erro ao criar conteúdo de ajuda:", insertError);
        } else if (newData) {
          setContent(newData.content || "");
          setHelpId(newData.id);
        }
      }
    } catch (error: any) {
      console.error("Erro ao carregar conteúdo de ajuda:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o conteúdo de ajuda.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!helpId) {
      toast({
        title: "Erro",
        description: "ID do conteúdo não encontrado.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("help_content")
        .update({
          content: content,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", helpId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conteúdo de ajuda salvo com sucesso!",
      });

      setIsEditing(false);
    } catch (error: any) {
      console.error("Erro ao salvar conteúdo de ajuda:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar o conteúdo de ajuda.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    fetchHelpContent();
    setIsEditing(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <HelpCircle className="h-8 w-8" />
            Ajuda
          </h1>
          <p className="text-muted-foreground">
            {isAdmin && isEditing
              ? "Edite o conteúdo de ajuda para os usuários do sistema"
              : "Encontre respostas para suas dúvidas e aprenda a usar o sistema"}
          </p>
        </div>
        {isAdmin && !isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar Conteúdo
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documentação e Ajuda</CardTitle>
          <CardDescription>
            {isAdmin && isEditing
              ? "Use este editor para criar e atualizar a documentação de ajuda do sistema. Você pode usar formatação básica de texto."
              : "Consulte a documentação abaixo para entender melhor como usar o sistema."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="help-content">Conteúdo de Ajuda</Label>
                <Textarea
                  id="help-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Digite o conteúdo de ajuda aqui... Você pode usar formatação básica de texto."
                  className="min-h-[400px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Dica: Use quebras de linha para organizar o conteúdo. Você pode criar seções usando títulos e listas.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancel} disabled={saving}>
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              {content ? (
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {content}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Nenhum conteúdo de ajuda disponível</p>
                  <p className="text-sm">
                    {isAdmin
                      ? "Clique em 'Editar Conteúdo' para adicionar a primeira documentação de ajuda."
                      : "O conteúdo de ajuda ainda não foi configurado. Entre em contato com um administrador."}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Micro ajuda - Guia rápido */}
      <Card>
        <CardHeader>
          <CardTitle>Guia Rápido</CardTitle>
          <CardDescription>Informações básicas sobre o sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">📋 Pipeline</h3>
              <p className="text-muted-foreground">
                Gerencie o fluxo de candidatos através das diferentes etapas do processo seletivo. 
                Visualize e mova candidatos entre as fases do pipeline.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">💼 Vagas</h3>
              <p className="text-muted-foreground">
                Crie e gerencie vagas de emprego. Defina requisitos, salários, prazos e vincule 
                candidatos às oportunidades disponíveis.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">👥 Candidatos</h3>
              <p className="text-muted-foreground">
                Visualize e gerencie informações dos candidatos, incluindo documentos, histórico 
                e avaliações. Importe documentos e acompanhe o progresso de cada candidato.
              </p>
            </div>
            {isAdmin && (
              <>
                <div>
                  <h3 className="font-semibold mb-2">📊 Matriz</h3>
                  <p className="text-muted-foreground">
                    Crie e gerencie matrizes de avaliação para diferentes cargos. Defina critérios 
                    e documentos necessários para cada posição.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">📄 Documentos</h3>
                  <p className="text-muted-foreground">
                    Gerencie o catálogo de documentos do sistema. Adicione novos tipos de documentos, 
                    configure categorias e modalidades.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">👤 Usuários</h3>
                  <p className="text-muted-foreground">
                    Gerencie usuários do sistema, atribua funções (Recrutador, Administrador) e 
                    configure permissões de acesso.
                  </p>
                </div>
              </>
            )}
            <div>
              <h3 className="font-semibold mb-2">⚙️ Meu Perfil</h3>
              <p className="text-muted-foreground">
                Atualize suas informações pessoais, altere sua senha e configure preferências da conta.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

