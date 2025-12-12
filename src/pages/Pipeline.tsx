import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { 
  MapPin, 
  Building, 
  Users, 
  Search, 
  Filter, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Calendar,
  Eye,
  BarChart3,
  Target,
  CheckCircle,
  AlertCircle,
  XCircle,
  Plus
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Pipeline() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"kanban" | "stats">("kanban");

  // Fetch recruiters and their vacancies with enhanced data including candidates
  const { data: recruitersData, isLoading } = useQuery({
    queryKey: ["recruiters-vacancies"],
    queryFn: async () => {
      // First, get all vacancies with recruiter_id and additional data
      const { data: vacancies, error: vacanciesError } = await (supabase
        .from("vacancies")
        .select(`
          id,
          title,
          description,
          department,
          location,
          status,
          recruiter_id,
          salary,
          salary_range,
          employment_type,
          company,
          created_at,
          updated_at,
          candidates_count
        `)
        .not("recruiter_id", "is", null) as any);

      if (vacanciesError) throw vacanciesError;

      // Then, get all unique recruiter IDs
      const recruiterIds = [...new Set((vacancies as any)?.map((v: any) => v.recruiter_id).filter(Boolean) || [])] as string[];
      
      // Fetch profiles for these recruiters
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", recruiterIds);

      if (profilesError) throw profilesError;

      // Get all vacancy IDs to fetch related candidates
      const vacancyIds = (vacancies as any)?.map((v: any) => v.id) || [];
      
      // Fetch candidates related to these vacancies
      let vacancyCandidatesMap: Record<string, any[]> = {};
      if (vacancyIds.length > 0) {
        const { data: vacancyCandidates, error: candidatesError } = await (supabase
          .from("vacancy_candidates" as any)
          .select(`
            vacancy_id,
            candidates!inner (
              id,
              name,
              email,
              role_title
            )
          `)
          .in("vacancy_id", vacancyIds) as any);

        if (!candidatesError && vacancyCandidates) {
          vacancyCandidates.forEach((vc: any) => {
            if (!vacancyCandidatesMap[vc.vacancy_id]) {
              vacancyCandidatesMap[vc.vacancy_id] = [];
            }
            // Handle both single object and array formats from Supabase
            const candidates = Array.isArray(vc.candidates) ? vc.candidates : (vc.candidates ? [vc.candidates] : []);
            candidates.forEach((candidate: any) => {
              if (candidate) {
                vacancyCandidatesMap[vc.vacancy_id].push(candidate);
              }
            });
          });
        }
      }

      // Combine the data
      return (vacancies as any)?.map((vacancy: any) => ({
        ...vacancy,
        profiles: profiles?.find((p: any) => p.id === vacancy.recruiter_id),
        candidates: vacancyCandidatesMap[vacancy.id] || []
      })) || [];
    },
  });

  // Filter vacancies based on search and status (including candidate search)
  const filteredVacancies = useMemo(() => {
    if (!recruitersData) return [];
    
    return recruitersData.filter(vacancy => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === "" || 
        vacancy.title.toLowerCase().includes(searchLower) ||
        vacancy.department?.toLowerCase().includes(searchLower) ||
        vacancy.company?.toLowerCase().includes(searchLower) ||
        vacancy.profiles?.name.toLowerCase().includes(searchLower) ||
        // Search in candidates (perfis)
        vacancy.candidates?.some((candidate: any) => 
          candidate.name?.toLowerCase().includes(searchLower) ||
          candidate.email?.toLowerCase().includes(searchLower) ||
          candidate.role_title?.toLowerCase().includes(searchLower)
        );
      
      const matchesStatus = statusFilter === "all" || vacancy.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [recruitersData, searchTerm, statusFilter]);

  // Group filtered vacancies by recruiter
  const groupedVacancies = filteredVacancies?.reduce((acc, vacancy) => {
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

  // Calculate statistics
  const stats = useMemo(() => {
    if (!recruitersData) return { totalVacancies: 0, totalRecruiters: 0, activeVacancies: 0, closedVacancies: 0, totalCandidates: 0 };
    
    const totalVacancies = recruitersData.length;
    const totalRecruiters = new Set(recruitersData.map(v => v.recruiter_id)).size;
    const activeVacancies = recruitersData.filter(v => v.status === 'open').length;
    const closedVacancies = recruitersData.filter(v => v.status === 'closed').length;
    const totalCandidates = recruitersData.reduce((sum, v) => sum + (v.candidates_count || 0), 0);
    
    return { totalVacancies, totalRecruiters, activeVacancies, closedVacancies, totalCandidates };
  }, [recruitersData]);

  // Handler to filter vacancies by clicking on stat cards
  const handleStatCardClick = (filterType: 'all' | 'open' | 'closed') => {
    setStatusFilter(filterType);
    setViewMode('kanban');
  };

  const formatSalary = (salary: string | number) => {
    if (!salary) return "-";
    const numSalary = typeof salary === 'string' ? parseFloat(salary) : salary;
    if (isNaN(numSalary)) return "-";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numSalary);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'closed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'paused': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800 border-green-200';
      case 'closed': return 'bg-red-100 text-red-800 border-red-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando pipeline...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            Pipeline
            <Badge variant="secondary" className="ml-2 text-sm bg-blue-100 text-blue-800">
              {stats.totalVacancies} {stats.totalVacancies === 1 ? 'vaga' : 'vagas'}
            </Badge>
          </h1>
          <p className="text-muted-foreground">
            Visualize e gerencie vagas por responsável com métricas em tempo real
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant={viewMode === "kanban" ? "default" : "outline"}
            onClick={() => setViewMode("kanban")}
            className="flex items-center gap-2"
          >
            <Target className="h-4 w-4" />
            Kanban
          </Button>
          <Button
            variant={viewMode === "stats" ? "default" : "outline"}
            onClick={() => setViewMode("stats")}
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Estatísticas
          </Button>
          <Button 
            onClick={() => navigate('/vacancies/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova vaga
          </Button>
        </div>
      </div>

      {/* Statistics Dashboard */}
      {viewMode === "stats" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card 
            className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105"
            onClick={() => handleStatCardClick('all')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total de Vagas</p>
                  <p className="text-3xl font-bold text-blue-800">{stats.totalVacancies}</p>
                  <p className="text-xs text-blue-500 mt-1">Clique para ver todas</p>
                </div>
                <Building className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105"
            onClick={() => handleStatCardClick('open')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Vagas Abertas</p>
                  <p className="text-3xl font-bold text-green-800">{stats.activeVacancies}</p>
                  <p className="text-xs text-green-500 mt-1">Clique para ver abertas</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105"
            onClick={() => handleStatCardClick('closed')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Vagas Fechadas</p>
                  <p className="text-3xl font-bold text-red-800">{stats.closedVacancies}</p>
                  <p className="text-xs text-red-500 mt-1">Clique para ver fechadas</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Recrutadores</p>
                  <p className="text-3xl font-bold text-purple-800">{stats.totalRecruiters}</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Total Candidatos</p>
                  <p className="text-3xl font-bold text-orange-800">{stats.totalCandidates}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filter Section */}
      <Card className="mb-6 shadow-sm border-gray-200">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Search className="h-5 w-5 text-blue-600" />
            Buscar e Filtrar
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por título, empresa, departamento, responsável ou candidato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 h-11">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="open">Abertas</SelectItem>
                <SelectItem value="closed">Fechadas</SelectItem>
                <SelectItem value="paused">Pausadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vacancies List in Statistics View - Grouped by Recruiter */}
      {viewMode === "stats" && (
        <div className="space-y-6">
          {Object.values(groupedVacancies).length === 0 ? (
            <Card className="shadow-sm border-gray-200">
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Nenhuma vaga encontrada</p>
                  <p className="text-sm">
                    {searchTerm || statusFilter !== "all" 
                      ? "Tente ajustar os filtros de busca" 
                      : "As vagas precisam ter um responsável atribuído"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            Object.values(groupedVacancies).map(({ recruiter, vacancies }) => (
              <Card key={recruiter.id} className="shadow-sm border-gray-200">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-blue-600" />
                      <div>
                        <CardTitle className="text-lg font-semibold text-slate-800">
                          {recruiter.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {recruiter.email}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-sm">
                      {vacancies.length} {vacancies.length === 1 ? 'vaga' : 'vagas'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">Título</TableHead>
                        <TableHead className="font-semibold">Empresa</TableHead>
                        <TableHead className="font-semibold">Departamento</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Candidatos</TableHead>
                        <TableHead className="font-semibold">Localização</TableHead>
                        <TableHead className="font-semibold">Criado em</TableHead>
                        <TableHead className="text-right font-semibold">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vacancies.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Nenhuma vaga encontrada com os filtros aplicados
                          </TableCell>
                        </TableRow>
                      ) : (
                        vacancies.map((vacancy) => (
                          <TableRow 
                            key={vacancy.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => navigate(`/vacancies/${vacancy.id}`)}
                          >
                            <TableCell className="font-medium">{vacancy.title}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-gray-400" />
                                <span>{vacancy.company || "-"}</span>
                              </div>
                            </TableCell>
                            <TableCell>{vacancy.department || "-"}</TableCell>
                            <TableCell>
                              <Badge 
                                className={`text-xs ${getStatusColor(vacancy.status)}`}
                              >
                                <div className="flex items-center gap-1">
                                  {getStatusIcon(vacancy.status)}
                                  <span className="capitalize">{vacancy.status}</span>
                                </div>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-gray-400" />
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                  {vacancy.candidates_count || 0}
                                </Badge>
                                {vacancy.candidates && vacancy.candidates.length > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    ({vacancy.candidates.length} perfis)
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span>{vacancy.location || "-"}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(vacancy.created_at)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/vacancies/${vacancy.id}`);
                                }}
                                className="h-8"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <div className="flex gap-6 overflow-x-auto pb-4">
          {Object.values(groupedVacancies).map(({ recruiter, vacancies }) => (
            <div key={recruiter.id} className="flex-shrink-0 w-80">
              <Card className="h-full shadow-lg border-gray-200">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      {recruiter.name}
                    </CardTitle>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {vacancies.length}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {recruiter.email}
                  </p>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="min-h-[300px] space-y-3">
                    {vacancies.map((vacancy) => (
                      <Card
                        key={vacancy.id}
                        className="cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] border-gray-200"
                        onClick={() => navigate(`/vacancies/${vacancy.id}`)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-sm font-medium text-slate-800">
                              {vacancy.title}
                            </CardTitle>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(vacancy.status)}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {vacancy.description || "Sem descrição"}
                          </p>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-2">
                          <div className="space-y-1 text-xs text-muted-foreground">
                            {vacancy.company && (
                              <div className="flex items-center gap-2">
                                <Building className="h-3 w-3" />
                                <span className="truncate">{vacancy.company}</span>
                              </div>
                            )}
                            {vacancy.department && (
                              <div className="flex items-center gap-2">
                                <Building className="h-3 w-3" />
                                <span className="truncate">{vacancy.department}</span>
                              </div>
                            )}
                            {vacancy.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate">{vacancy.location}</span>
                              </div>
                            )}
                            {(vacancy.salary || vacancy.salary_range) && (
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-3 w-3" />
                                <span className="truncate">
                                  {vacancy.salary_range || formatSalary(vacancy.salary)}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between pt-2">
                            <Badge 
                              className={`text-xs ${getStatusColor(vacancy.status)}`}
                            >
                              {vacancy.status}
                            </Badge>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              <span>{vacancy.candidates_count || 0}</span>
                            </div>
                          </div>
                          
                          {/* Show candidates (perfis) related to this vacancy */}
                          {vacancy.candidates && vacancy.candidates.length > 0 && (
                            <div className="pt-2 border-t border-gray-100">
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                Candidatos:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {vacancy.candidates.slice(0, 3).map((candidate: any) => (
                                  <Badge 
                                    key={candidate.id}
                                    variant="outline"
                                    className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                                  >
                                    {candidate.name}
                                  </Badge>
                                ))}
                                {vacancy.candidates.length > 3 && (
                                  <Badge 
                                    variant="outline"
                                    className="text-xs bg-gray-50 text-gray-600 border-gray-200"
                                  >
                                    +{vacancy.candidates.length - 3} mais
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                            <Calendar className="h-3 w-3" />
                            <span>Criado em {formatDate(vacancy.created_at)}</span>
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
              <Card className="h-full shadow-lg border-gray-200">
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Nenhum responsável encontrado</p>
                    <p className="text-sm">As vagas precisam ter um responsável atribuído</p>
                    <Button 
                      className="mt-4"
                      onClick={() => navigate('/vacancies/new')}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Criar primeira vaga
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
