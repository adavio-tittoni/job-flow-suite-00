import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Camera } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { CandidateForm } from "./CandidateForm";
import { CandidateHistoryTab } from "./CandidateHistoryTab";
import { CandidateDocumentsTab } from "./CandidateDocumentsTab";
import { useCandidates, type Candidate } from "@/hooks/useCandidates";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export const CandidateDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get navigation context
  const from = searchParams.get('from');
  const vacancyId = searchParams.get('vacancyId');
  const [currentTab, setCurrentTab] = useState(() => {
    const tab = searchParams.get('tab');
    return tab === 'dados' || tab === 'history' ? tab : 'documents';
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { updateCandidate } = useCandidates();
  const { toast } = useToast();
  const { user } = useAuth();

  const handleTabChange = (value: string) => {
    setCurrentTab(value);
    setSearchParams({ tab: value }, { replace: true });
  };

  const { data: candidate, isLoading } = useQuery({
    queryKey: ["candidate", id],
    queryFn: async () => {
      if (!id) throw new Error("ID não fornecido");
      
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Candidato não encontrado");
      
      return data as unknown as Candidate;
    },
    enabled: !!id,
  });

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !candidate) return;

    setIsUploading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${candidate.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('candidate-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('candidate-photos')
        .getPublicUrl(fileName);

      // Update candidate with photo URL
      await updateCandidate.mutateAsync({
        id: candidate.id,
        photo_url: publicUrl,
      });

      // Invalidate query to refresh data
      queryClient.invalidateQueries({ queryKey: ["candidate", id] });

      toast({
        title: "Foto atualizada",
        description: "A foto do candidato foi atualizada com sucesso."
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Erro ao fazer upload",
        description: "Ocorreu um erro ao fazer upload da foto.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Carregando candidato...</div>;
  }

  if (!candidate) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Candidato não encontrado</h2>
          <Button onClick={() => {
            if (from === 'vacancy' && vacancyId) {
              navigate(`/vacancies/${vacancyId}`);
            } else {
              navigate("/candidates");
            }
          }}>
            Voltar para lista
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => {
              if (from === 'vacancy' && vacancyId) {
                navigate(`/vacancies/${vacancyId}`);
              } else {
                navigate("/candidates");
              }
            }} className="hover:bg-white/50">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-blue-600 font-bold text-lg">👤</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    {candidate.name}
                    {candidate.blacklisted && (
                      <Badge variant="destructive" className="text-xs">Blacklist</Badge>
                    )}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                      {candidate.role_title || 'Candidato'}
                    </Badge>
                    <span className="text-slate-600 text-sm">
                      {candidate.email || "Email não informado"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {currentTab === "dados" && (
              <Button type="submit" form="candidate-data-form" className="ml-8 bg-blue-600 hover:bg-blue-700">
                Salvar alterações
              </Button>
            )}
          </div>
          
          {/* Enhanced Avatar with upload */}
          <div className="relative">
            <Avatar className="h-28 w-28 cursor-pointer border-4 border-white shadow-lg" onClick={() => fileInputRef.current?.click()}>
              <AvatarImage src={candidate.photo_url} />
              <AvatarFallback className="text-2xl font-bold bg-blue-100 text-blue-600">
                {getInitials(candidate.name)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Camera className="h-8 w-8 text-white" />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
              disabled={isUploading}
            />
          </div>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100">
            <TabsTrigger 
              value="documents"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white font-semibold"
            >
              📋 Documentos
            </TabsTrigger>
            <TabsTrigger 
              value="dados"
              className="data-[state=active]:bg-green-500 data-[state=active]:text-white font-semibold"
            >
              👤 Dados
            </TabsTrigger>
            <TabsTrigger 
              value="history"
              className="data-[state=active]:bg-purple-500 data-[state=active]:text-white font-semibold"
            >
              📊 Histórico
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="documents">
          <CandidateDocumentsTab candidateId={candidate.id} candidateName={candidate.name} />
        </TabsContent>

        <TabsContent value="dados">
          <CandidateForm
            candidate={candidate}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["candidate", id] });
              toast({
                title: "Candidato atualizado",
                description: "As informações do candidato foram atualizadas com sucesso."
              });
            }}
            onCancel={() => {}}
          />
        </TabsContent>

        <TabsContent value="history">
          <CandidateHistoryTab candidateId={candidate.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
