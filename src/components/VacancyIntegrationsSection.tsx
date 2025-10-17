import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link2, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface VacancyIntegration {
  id: string;
  provider: 'google_drive' | 'microsoft_365';
  folder_id: string;
  folder_name: string;
  folder_url?: string;
  is_active: boolean;
}

interface VacancyIntegrationsSectionProps {
  vacancyId: string;
}

const VacancyIntegrationsSection = ({ vacancyId }: VacancyIntegrationsSectionProps) => {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<VacancyIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIntegration, setNewIntegration] = useState({
    provider: 'google_drive' as const,
    folder_id: '',
    folder_name: '',
    folder_url: '',
  });

  const fetchIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('vacancy_integrations')
        .select('*')
        .eq('vacancy_id', vacancyId);

      if (error) throw error;
      setIntegrations((data || []) as VacancyIntegration[]);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as integrações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, [vacancyId]);

  const handleAddIntegration = async (provider: 'google_drive' | 'microsoft_365') => {
    if (!newIntegration.folder_id.trim() || !newIntegration.folder_name.trim()) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('vacancy_integrations')
        .insert({
          vacancy_id: vacancyId,
          provider,
          folder_id: newIntegration.folder_id,
          folder_name: newIntegration.folder_name,
          folder_url: newIntegration.folder_url || null,
          is_active: true,
        });

      if (error) throw error;

      setNewIntegration({
        provider: 'google_drive',
        folder_id: '',
        folder_name: '',
        folder_url: '',
      });

      await fetchIntegrations();

      toast({
        title: "Sucesso",
        description: "Integração adicionada com sucesso.",
      });
    } catch (error) {
      console.error('Error adding integration:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a integração.",
        variant: "destructive",
      });
    }
  };

  const handleToggleIntegration = async (integrationId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('vacancy_integrations')
        .update({ is_active: isActive })
        .eq('id', integrationId);

      if (error) throw error;

      await fetchIntegrations();

      toast({
        title: "Sucesso",
        description: `Integração ${isActive ? 'ativada' : 'desativada'} com sucesso.`,
      });
    } catch (error) {
      console.error('Error toggling integration:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status da integração.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteIntegration = async (integrationId: string) => {
    try {
      const { error } = await supabase
        .from('vacancy_integrations')
        .delete()
        .eq('id', integrationId);

      if (error) throw error;

      await fetchIntegrations();

      toast({
        title: "Sucesso",
        description: "Integração removida com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting integration:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a integração.",
        variant: "destructive",
      });
    }
  };

  const getProviderIcon = (provider: string) => {
    if (provider === 'google_drive') {
      return (
        <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center text-white font-bold">
          G
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold">
        M
      </div>
    );
  };

  const getProviderName = (provider: string) => {
    return provider === 'google_drive' ? 'Google Drive' : 'Microsoft 365';
  };

  if (loading) {
    return <div>Carregando integrações...</div>;
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Link2 className="h-4 w-4" />
        <AlertDescription>
          Configure integrações para criar automaticamente pastas onde os certificados dos candidatos serão organizados.
        </AlertDescription>
      </Alert>

      {/* Existing integrations */}
      {integrations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Integrações ativas</h3>
          {integrations.map((integration) => (
            <Card key={integration.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getProviderIcon(integration.provider)}
                    <div>
                      <h4 className="font-medium">{getProviderName(integration.provider)}</h4>
                      <p className="text-sm text-muted-foreground">
                        {integration.folder_name}
                      </p>
                      {integration.folder_url && (
                        <a 
                          href={integration.folder_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Abrir pasta
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={integration.is_active}
                      onCheckedChange={(checked) => handleToggleIntegration(integration.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteIntegration(integration.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add new integration */}
      <Card>
        <CardHeader>
          <CardTitle>Adicionar nova integração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="folder_id">ID da Pasta *</Label>
              <Input
                id="folder_id"
                value={newIntegration.folder_id}
                onChange={(e) => setNewIntegration({ ...newIntegration, folder_id: e.target.value })}
                placeholder="Ex: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
              />
            </div>
            <div>
              <Label htmlFor="folder_name">Nome da Pasta *</Label>
              <Input
                id="folder_name"
                value={newIntegration.folder_name}
                onChange={(e) => setNewIntegration({ ...newIntegration, folder_name: e.target.value })}
                placeholder="Ex: Certificados - Vaga Desenvolvedor"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="folder_url">URL da Pasta (opcional)</Label>
            <Input
              id="folder_url"
              value={newIntegration.folder_url}
              onChange={(e) => setNewIntegration({ ...newIntegration, folder_url: e.target.value })}
              placeholder="https://drive.google.com/drive/folders/..."
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={() => handleAddIntegration('google_drive')} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                G
              </div>
              Conectar Google Drive
            </Button>
            <Button onClick={() => handleAddIntegration('microsoft_365')} variant="outline" className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                M
              </div>
              Conectar Microsoft 365
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VacancyIntegrationsSection;
