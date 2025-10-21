import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Building, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Pipeline() {
  const navigate = useNavigate();

  // Fetch recruiters and their vacancies
  const { data: recruitersData, isLoading } = useQuery({
    queryKey: ["recruiters-vacancies"],
    queryFn: async () => {
      // First, get all vacancies with recruiter_id
      const { data: vacancies, error: vacanciesError } = await supabase
        .from("vacancies")
        .select(`
          id,
          title,
          description,
          department,
          location,
          status,
          recruiter_id
        `)
        .not("recruiter_id", "is", null);

      if (vacanciesError) throw vacanciesError;

      // Then, get all unique recruiter IDs
      const recruiterIds = [...new Set(vacancies?.map(v => v.recruiter_id) || [])];
      
      // Fetch profiles for these recruiters
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", recruiterIds);

      if (profilesError) throw profilesError;

      // Combine the data
      return vacancies?.map(vacancy => ({
        ...vacancy,
        profiles: profiles?.find(p => p.id === vacancy.recruiter_id)
      })) || [];
    },
  });

  // Group vacancies by recruiter
  const groupedVacancies = recruitersData?.reduce((acc, vacancy) => {
    const recruiterId = vacancy.recruiter_id;
    if (!acc[recruiterId]) {
      acc[recruiterId] = {
        recruiter: vacancy.profiles,
        vacancies: []
      };
    }
    acc[recruiterId].vacancies.push(vacancy);
    return acc;
  }, {} as Record<string, { recruiter: any; vacancies: any[] }>) || {};

  const formatSalary = (salary: string) => {
    if (!salary) return "-";
    const numSalary = parseFloat(salary);
    if (isNaN(numSalary)) return salary;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numSalary);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground">Visualize as vagas por responsável</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pipeline</h1>
        <p className="text-muted-foreground">Visualize as vagas por responsável</p>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4">
        {Object.values(groupedVacancies).map(({ recruiter, vacancies }) => (
          <div key={recruiter.id} className="flex-shrink-0 w-80">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {recruiter.name}
                  </CardTitle>
                  <Badge variant="secondary">
                    {vacancies.length}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {recruiter.email}
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="min-h-[200px] space-y-2 p-2 rounded-lg bg-muted/20">
                  {vacancies.map((vacancy) => (
                    <Card
                      key={vacancy.id}
                      className="cursor-pointer transition-shadow hover:shadow-md"
                      onClick={() => navigate(`/vacancies/${vacancy.id}`)}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          {vacancy.title}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {vacancy.description || "Sem descrição"}
                        </p>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            <span className="truncate">{vacancy.department || "-"}</span>
                          </div>
                          {vacancy.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{vacancy.location}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <Badge 
                            variant={vacancy.status === 'active' ? 'default' : 'secondary'} 
                            className="text-xs"
                          >
                            {vacancy.status}
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

        {/* Empty state if no recruiters */}
        {Object.keys(groupedVacancies).length === 0 && (
          <div className="flex-shrink-0 w-80">
            <Card className="h-full">
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum responsável encontrado</p>
                  <p className="text-sm">As vagas precisam ter um responsável atribuído</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
