import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePipelineStages, useApplications, useUpdateApplicationStage } from "@/hooks/usePipeline";
import { Plus, MapPin, Building, Settings, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function Pipeline() {
  const { data: stages = [], isLoading: stagesLoading } = usePipelineStages();
  const { data: applications = [], isLoading: applicationsLoading } = useApplications();
  const updateStage = useUpdateApplicationStage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleMoveApplication = async (applicationId: string, stageId: string) => {
    try {
      await updateStage.mutateAsync({ applicationId, stageId: stageId || "" });
      toast({
        title: "Candidato movido",
        description: "O candidato foi movido para o novo estágio.",
      });
    } catch (error) {
      toast({
        title: "Erro ao mover candidato",
        description: "Não foi possível mover o candidato. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getApplicationsByStage = (stageId: string) => {
    return applications.filter(app => app.stage_id === stageId);
  };

  const getApplicationsWithoutStage = () => {
    return applications.filter(app => !app.stage_id);
  };

  const formatSalary = (salary: string) => {
    if (!salary) return "-";
    const numSalary = parseFloat(salary);
    if (isNaN(numSalary)) return salary;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numSalary);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (stagesLoading || applicationsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground">Visualize e gerencie o funil de recrutamento</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground">Visualize e gerencie o funil de recrutamento</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Gerenciar Estágios
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova Candidatura
          </Button>
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4">
        {/* Estágio "Sem Estágio" para candidatos não atribuídos */}
        <div className="flex-shrink-0 w-80">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Sem Estágio
                </CardTitle>
                <Badge variant="secondary">
                  {getApplicationsWithoutStage().length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="min-h-[200px] space-y-2 p-2 rounded-lg bg-muted/20">
                {getApplicationsWithoutStage().map((application, index) => (
                  <Card
                    key={application.id}
                    className="cursor-pointer transition-shadow hover:shadow-md"
                    onDoubleClick={() => navigate(`/candidates/${application.candidate.id}`)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-sm font-medium">
                          {application.candidate.name}
                        </CardTitle>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {application.vacancy.title}
                      </p>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          <span className="truncate">{application.vacancy.department || "-"}</span>
                        </div>
                        {application.vacancy.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{application.vacancy.location}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {application.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estágios do pipeline */}
        {stages.map((stage) => (
          <div key={stage.id} className="flex-shrink-0 w-80">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    {stage.name}
                  </CardTitle>
                  <Badge variant="secondary">
                    {getApplicationsByStage(stage.id).length}
                  </Badge>
                </div>
                {stage.description && (
                  <p className="text-xs text-muted-foreground">{stage.description}</p>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="min-h-[200px] space-y-2 p-2 rounded-lg bg-muted/20">
                  {getApplicationsByStage(stage.id).map((application, index) => (
                    <Card
                      key={application.id}
                      className="cursor-pointer transition-shadow hover:shadow-md"
                      onDoubleClick={() => navigate(`/candidates/${application.candidate.id}`)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-sm font-medium">
                            {application.candidate.name}
                          </CardTitle>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {application.vacancy.title}
                        </p>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            <span className="truncate">{application.vacancy.department || "-"}</span>
                          </div>
                          {application.vacancy.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{application.vacancy.location}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {application.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
