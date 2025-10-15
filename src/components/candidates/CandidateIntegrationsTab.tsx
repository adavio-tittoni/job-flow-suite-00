import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, ExternalLink } from "lucide-react";
import { useCandidateHistory } from "@/hooks/useCandidates";
import { useToast } from "@/hooks/use-toast";

interface CandidateIntegrationsTabProps {
  candidateId: string;
}

interface Integration {
  id: string;
  platform: string;
  status: 'active' | 'inactive' | 'pending';
  lastSync: string;
  data: Record<string, any>;
}

const CandidateIntegrationsTab = ({ candidateId }: CandidateIntegrationsTabProps) => {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: '1',
      platform: 'LinkedIn',
      status: 'active',
      lastSync: '2024-12-20T10:30:00Z',
      data: { profileUrl: 'https://linkedin.com/in/candidate', connections: 500 }
    },
    {
      id: '2',
      platform: 'GitHub',
      status: 'active',
      lastSync: '2024-12-20T09:15:00Z',
      data: { username: 'candidate-dev', repositories: 25 }
    },
    {
      id: '3',
      platform: 'Indeed',
      status: 'inactive',
      lastSync: '2024-12-15T14:20:00Z',
      data: { profileId: 'indeed-123', applications: 10 }
    }
  ]);

  const [isAddingIntegration, setIsAddingIntegration] = useState(false);
  const [newIntegration, setNewIntegration] = useState({
    platform: '',
    status: 'pending' as const,
    data: {}
  });

  const { toast } = useToast();

  const handleAddIntegration = () => {
    if (!newIntegration.platform) {
      toast({
        title: "Erro",
        description: "Selecione uma plataforma",
        variant: "destructive",
      });
      return;
    }

    const integration: Integration = {
      id: Date.now().toString(),
      platform: newIntegration.platform,
      status: newIntegration.status,
      lastSync: new Date().toISOString(),
      data: newIntegration.data
    };

    setIntegrations([...integrations, integration]);
    setNewIntegration({ platform: '', status: 'pending', data: {} });
    setIsAddingIntegration(false);

    toast({
      title: "Integração adicionada",
      description: `Integração com ${integration.platform} foi adicionada com sucesso.`,
    });
  };

  const handleRemoveIntegration = (id: string) => {
    setIntegrations(integrations.filter(integration => integration.id !== id));
    toast({
      title: "Integração removida",
      description: "A integração foi removida com sucesso.",
    });
  };

  const handleSyncIntegration = (id: string) => {
    setIntegrations(integrations.map(integration => 
      integration.id === id 
        ? { ...integration, lastSync: new Date().toISOString() }
        : integration
    ));
    
    toast({
      title: "Sincronização realizada",
      description: "Os dados foram sincronizados com sucesso.",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Ativo</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inativo</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Pendente</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const formatLastSync = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Integrações</h2>
          <p className="text-muted-foreground">
            Gerencie as integrações com plataformas externas
          </p>
        </div>
        <Button onClick={() => setIsAddingIntegration(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Integração
        </Button>
      </div>

      {/* Add Integration Form */}
      {isAddingIntegration && (
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Nova Integração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="platform">Plataforma</Label>
                <Select 
                  value={newIntegration.platform} 
                  onValueChange={(value) => setNewIntegration({ ...newIntegration, platform: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar plataforma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                    <SelectItem value="GitHub">GitHub</SelectItem>
                    <SelectItem value="Indeed">Indeed</SelectItem>
                    <SelectItem value="Glassdoor">Glassdoor</SelectItem>
                    <SelectItem value="AngelList">AngelList</SelectItem>
                    <SelectItem value="Behance">Behance</SelectItem>
                    <SelectItem value="Dribbble">Dribbble</SelectItem>
                    <SelectItem value="Portfolio">Portfolio Pessoal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={newIntegration.status} 
                  onValueChange={(value: 'active' | 'inactive' | 'pending') => 
                    setNewIntegration({ ...newIntegration, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddIntegration}>
                Adicionar Integração
              </Button>
              <Button variant="outline" onClick={() => setIsAddingIntegration(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Integrations List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((integration) => (
          <Card key={integration.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{integration.platform}</CardTitle>
                {getStatusBadge(integration.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Última sincronização:</span>
                  <span className="font-medium">{formatLastSync(integration.lastSync)}</span>
                </div>
              </div>

              {/* Platform-specific data */}
              {integration.platform === 'LinkedIn' && (
                <div className="space-y-1">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Conexões:</span>
                    <span className="ml-2 font-medium">{integration.data.connections}</span>
                  </div>
                  {integration.data.profileUrl && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Perfil:</span>
                      <Button variant="ghost" size="sm" asChild>
                        <a 
                          href={integration.data.profileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Ver perfil
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {integration.platform === 'GitHub' && (
                <div className="space-y-1">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Repositórios:</span>
                    <span className="ml-2 font-medium">{integration.data.repositories}</span>
                  </div>
                  {integration.data.username && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Usuário:</span>
                      <span className="ml-2 font-medium">{integration.data.username}</span>
                    </div>
                  )}
                </div>
              )}

              {integration.platform === 'Indeed' && (
                <div className="space-y-1">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Candidaturas:</span>
                    <span className="ml-2 font-medium">{integration.data.applications}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleSyncIntegration(integration.id)}
                  disabled={integration.status === 'inactive'}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Sincronizar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleRemoveIntegration(integration.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Remover
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {integrations.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              Nenhuma integração configurada
            </p>
            <Button onClick={() => setIsAddingIntegration(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeira Integração
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CandidateIntegrationsTab;