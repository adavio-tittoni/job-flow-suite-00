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
import CandidateIntegrationsTab from "./CandidateIntegrationsTab";
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
    return tab === 'dados' || tab === 'history' || tab === 'integrations' ? tab : 'documents';
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
      
      return data as Candidate;
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => {
            if (from === 'vacancy' && vacancyId) {
              navigate(`/vacancies/${vacancyId}`);
            } else {
              navigate("/candidates");
            }
          }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {candidate.name}
              {candidate.blacklisted && (
                <Badge variant="destructive">Blacklist</Badge>
              )}
            </h1>
            <p className="text-muted-foreground">
              {candidate.role_title && `${candidate.role_title} • `}
              {candidate.email || "Email não informado"}
            </p>
          </div>
          
          {currentTab === "dados" && (
            <Button type="submit" form="candidate-data-form" className="ml-8">
              Salvar alterações
            </Button>
          )}
        </div>
        
        {/* Avatar with upload */}
        <div className="relative">
          <Avatar className="h-24 w-24 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <AvatarImage src={candidate.photo_url} />
            <AvatarFallback>{getInitials(candidate.name)}</AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <Camera className="h-6 w-6 text-white" />
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

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
        </TabsList>

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
            formId="candidate-data-form"
            showActions={false}
          />
        </TabsContent>

        <TabsContent value="history">
          <CandidateHistoryTab candidateId={candidate.id} />
        </TabsContent>

        <TabsContent value="integrations">
          <CandidateIntegrationsTab candidateId={candidate.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
