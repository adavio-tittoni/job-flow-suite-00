import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ExternalLink } from "lucide-react";

interface DraftIntegration {
  id: string;
  provider: "google_drive" | "microsoft_365";
  folder_name: string;
  folder_id: string;
  folder_url?: string;
}

interface VacancyIntegrationsDraftSectionProps {
  draftIntegrations: DraftIntegration[];
  onUpdateDraftIntegrations: (integrations: DraftIntegration[]) => void;
}

const VacancyIntegrationsDraftSection = ({ draftIntegrations, onUpdateDraftIntegrations }: VacancyIntegrationsDraftSectionProps) => {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [newIntegration, setNewIntegration] = useState({
    provider: "" as "google_drive" | "microsoft_365" | "",
    folder_name: "",
    folder_id: "",
    folder_url: "",
  });

  const handleAddIntegration = () => {
    if (!newIntegration.provider || !newIntegration.folder_name.trim() || !newIntegration.folder_id.trim()) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const integration: DraftIntegration = {
      id: Date.now().toString(), // Temporary ID for draft
      provider: newIntegration.provider,
      folder_name: newIntegration.folder_name,
      folder_id: newIntegration.folder_id,
      folder_url: newIntegration.folder_url || undefined,
    };

    onUpdateDraftIntegrations([...draftIntegrations, integration]);
    setNewIntegration({ provider: "", folder_name: "", folder_id: "", folder_url: "" });
    setIsAdding(false);

    toast({
      title: "Sucesso",
      description: "Integração adicionada. Salve a vaga para confirmar.",
    });
  };

  const handleRemoveIntegration = (id: string) => {
    onUpdateDraftIntegrations(draftIntegrations.filter(integration => integration.id !== id));
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google_drive':
        return <div className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center text-white text-xs font-bold">G</div>;
      case 'microsoft_365':
        return <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-white text-xs font-bold">M</div>;
      default:
        return null;
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'google_drive':
        return 'Google Drive';
      case 'microsoft_365':
        return 'Microsoft 365';
      default:
        return provider;
    }
  };

  return (
    <div className="space-y-4">
      {draftIntegrations.length === 0 && !isAdding && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Nenhuma integração configurada</p>
          <p className="text-sm">Configure pastas do Google Drive ou Microsoft 365 para organizar documentos dos candidatos</p>
        </div>
      )}

      {draftIntegrations.map((integration) => (
        <Card key={integration.id} className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {getProviderIcon(integration.provider)}
                <div>
                  <h4 className="font-medium">{integration.folder_name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {getProviderName(integration.provider)} • ID: {integration.folder_id}
                  </p>
                  {integration.folder_url && (
                    <a
                      href={integration.folder_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Abrir pasta
                    </a>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveIntegration(integration.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {isAdding ? (
        <Card className="border-dashed">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="provider">Provedor *</Label>
                <Select
                  value={newIntegration.provider}
                  onValueChange={(value: "google_drive" | "microsoft_365") =>
                    setNewIntegration({ ...newIntegration, provider: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o provedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google_drive">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-blue-500 flex items-center justify-center text-white text-xs font-bold">G</div>
                        Google Drive
                      </div>
                    </SelectItem>
                    <SelectItem value="microsoft_365">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center text-white text-xs font-bold">M</div>
                        Microsoft 365
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="folder_name">Nome da Pasta *</Label>
                <Input
                  id="folder_name"
                  value={newIntegration.folder_name}
                  onChange={(e) => setNewIntegration({ ...newIntegration, folder_name: e.target.value })}
                  placeholder="Ex: Candidatos - Desenvolvedor Frontend"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="folder_id">ID da Pasta *</Label>
                <Input
                  id="folder_id"
                  value={newIntegration.folder_id}
                  onChange={(e) => setNewIntegration({ ...newIntegration, folder_id: e.target.value })}
                  placeholder="ID obtido da URL da pasta"
                />
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
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleAddIntegration} size="sm">
                Adicionar
              </Button>
              <Button variant="outline" onClick={() => setIsAdding(false)} size="sm">
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          onClick={() => setIsAdding(true)}
          className="w-full border-dashed"
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar integração
        </Button>
      )}
    </div>
  );
};

export default VacancyIntegrationsDraftSection;
