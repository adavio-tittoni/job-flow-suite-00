import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCandidates, type Candidate } from "@/hooks/useCandidates";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { validateCPF, validatePhone } from "@/lib/validators";
import { formatCPF, formatPhone } from "@/lib/masks";
import { logger } from "@/lib/logger";

const candidateSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phones: z.string().optional(),
  cpf: z.string().optional().refine(
    (value) => !value || value.replace(/\D/g, '').length === 0 || validateCPF(value),
    { message: "CPF inválido. Verifique os dígitos." }
  ),
  linkedin_url: z.string().optional(),
  matrix_id: z.string().optional().or(z.undefined()),
  blacklisted: z.boolean().default(false),
  address_street: z.string().optional(),
  address_number: z.string().optional(),
  address_complement: z.string().optional(),
  address_district: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  notes: z.string().optional(),
});

type CandidateFormData = z.infer<typeof candidateSchema>;

interface CandidateFormProps {
  candidate?: Candidate | null;
  onSuccess: () => void;
  onCancel: () => void;
  compact?: boolean;
}

export const CandidateForm = ({ candidate, onSuccess, onCancel, compact = false }: CandidateFormProps) => {
  const { createCandidate, updateCandidate } = useCandidates();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedVacancyId, setSelectedVacancyId] = useState<string | undefined>(undefined);

  // Fetch vacancies for selection
  const { data: vacancies = [] } = useQuery({
    queryKey: ["vacancies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vacancies")
        .select("id, title, matrix_id")
        .order("title", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CandidateFormData>({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      name: candidate?.name || "",
      email: candidate?.email || "",
      phones: candidate?.phones || "",
      cpf: candidate?.cpf || "",
      linkedin_url: candidate?.linkedin_url || "",
      matrix_id: candidate?.matrix_id || undefined,
      blacklisted: candidate?.blacklisted || false,
      address_street: candidate?.address_street || "",
      address_number: candidate?.address_number || "",
      address_complement: candidate?.address_complement || "",
      address_district: candidate?.address_district || "",
      city: candidate?.city || "",
      state: candidate?.state || "",
      zip_code: candidate?.zip_code || "",
      notes: candidate?.notes || "",
    },
  });

  const normalizeLinkedInUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith('http')) return url;
    if (url.startsWith('linkedin.com')) return `https://${url}`;
    if (url.startsWith('/in/')) return `https://linkedin.com${url}`;
    return `https://linkedin.com/in/${url}`;
  };

  // Handle CPF input with formatting
  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    // Format as CPF
    if (value.length > 9) {
      value = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`;
    } else if (value.length > 6) {
      value = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6)}`;
    } else if (value.length > 3) {
      value = `${value.slice(0, 3)}.${value.slice(3)}`;
    }
    
    setValue("cpf", value);
  };

  // Handle phone input with formatting
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    // Format as phone
    if (value.length > 10) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    }
    
    setValue("phones", value);
  };

  const onSubmit = async (data: CandidateFormData) => {
    setIsSubmitting(true);
    try {
      // Validação: ao criar novo candidato, é obrigatório selecionar uma vaga
      if (!candidate && !selectedVacancyId) {
        toast({
          title: "Vaga obrigatória",
          description: "É necessário selecionar uma vaga para criar o candidato.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      logger.debug('CandidateForm: Submitting data');
      
      const normalizedData = {
        ...data,
        linkedin_url: data.linkedin_url ? normalizeLinkedInUrl(data.linkedin_url) : "",
        email: data.email || "", // Keep as empty string instead of null
        matrix_id: data.matrix_id || null,
      };

      if (candidate) {
        logger.debug('CandidateForm: Updating candidate');
        await updateCandidate.mutateAsync({ id: candidate.id, ...normalizedData });
        
        // Invalidate queries related to matrix comparison
        queryClient.invalidateQueries({ queryKey: ["candidate", candidate.id] });
        queryClient.invalidateQueries({ queryKey: ["candidate-requirement-status", candidate.id] });
        queryClient.invalidateQueries({ queryKey: ["candidate-documents", candidate.id] });
        queryClient.invalidateQueries({ queryKey: ["advanced-matrix-comparison", candidate.id] });
        queryClient.invalidateQueries({ queryKey: ["enhanced-matrix-comparison", candidate.id] });
        queryClient.invalidateQueries({ queryKey: ["vacancy-candidate-comparison"] });
      } else {
        logger.debug('CandidateForm: Creating new candidate');
        const newCandidate = await createCandidate.mutateAsync(normalizedData);
        
        // Após criar o candidato, vincular à vaga selecionada
        if (selectedVacancyId && newCandidate?.id) {
          const { error: linkError } = await supabase
            .from('vacancy_candidates')
            .insert({
              vacancy_id: selectedVacancyId,
              candidate_id: newCandidate.id,
            });
          
          if (linkError) {
            logger.error('Erro ao vincular candidato a vaga:', { error: linkError.message });
            toast({
              title: "Aviso",
              description: "Candidato criado, mas houve erro ao vincular à vaga. Você pode vincular manualmente depois.",
              variant: "destructive",
            });
          } else {
            logger.debug('Candidato vinculado a vaga com sucesso');
          }
        }
      }
      onSuccess();
    } catch (error: any) {
      logger.error('CandidateForm: Error submitting:', { error: error?.message });
      toast({
        title: "Erro",
        description: "Não foi possível salvar o candidato.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const blacklisted = watch("blacklisted");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome Completo (conforme o documento) *</Label>
          <Input
            id="name"
            {...register("name")}
            placeholder="Nome completo"
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="matrix_id">
            Vaga a ser concorrida {!candidate && <span className="text-destructive">*</span>}
          </Label>
          <Select 
            value={(() => {
              if (candidate) {
                // Find the vacancy that has the same matrix_id as the candidate
                const currentVacancy = vacancies.find(v => v.matrix_id === candidate?.matrix_id);
                return currentVacancy?.id || undefined;
              }
              return selectedVacancyId || undefined;
            })()} 
            onValueChange={(value) => {
              logger.debug('CandidateForm: Vacancy selected');
              setSelectedVacancyId(value);
              // Find the vacancy and get its matrix_id
              const selectedVacancy = vacancies.find(v => v.id === value);
              if (selectedVacancy) {
                setValue("matrix_id", selectedVacancy.matrix_id || undefined);
              } else {
                setValue("matrix_id", undefined);
                setSelectedVacancyId(undefined);
              }
            }}
          >
            <SelectTrigger className={!candidate && !selectedVacancyId ? "border-destructive" : ""}>
              <SelectValue placeholder="Selecione uma vaga..." />
            </SelectTrigger>
            <SelectContent>
              {vacancies.map((vacancy) => (
                <SelectItem key={vacancy.id} value={vacancy.id}>
                  {vacancy.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!candidate && !selectedVacancyId && (
            <p className="text-sm text-destructive">É obrigatório selecionar uma vaga para criar o candidato.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            placeholder="email@exemplo.com"
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phones">Telefone</Label>
          <Input
            id="phones"
            value={watch("phones") || ""}
            onChange={handlePhoneChange}
            placeholder="(11) 99999-9999"
            maxLength={16}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cpf">CPF</Label>
          <Input
            id="cpf"
            value={watch("cpf") || ""}
            onChange={handleCPFChange}
            placeholder="000.000.000-00"
            maxLength={14}
          />
          {errors.cpf && (
            <p className="text-sm text-destructive">{errors.cpf.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="linkedin_url">LinkedIn</Label>
          <Input
            id="linkedin_url"
            {...register("linkedin_url")}
            placeholder="linkedin.com/in/usuario"
          />
        </div>
      </div>

      {!compact && (
        <>
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address_street">Rua</Label>
                <Input
                  id="address_street"
                  {...register("address_street")}
                  placeholder="Nome da rua"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_number">Número</Label>
                <Input
                  id="address_number"
                  {...register("address_number")}
                  placeholder="123"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_complement">Complemento</Label>
                <Input
                  id="address_complement"
                  {...register("address_complement")}
                  placeholder="Apto 45"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_district">Bairro</Label>
                <Input
                  id="address_district"
                  {...register("address_district")}
                  placeholder="Nome do bairro"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  {...register("city")}
                  placeholder="Nome da cidade"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  {...register("state")}
                  placeholder="SP"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip_code">CEP</Label>
                <Input
                  id="zip_code"
                  {...register("zip_code")}
                  placeholder="00000-000"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Observações sobre o candidato..."
              rows={3}
            />
          </div>
        </>
      )}

      <div className="flex items-center space-x-2">
        <Switch
          id="blacklisted"
          checked={blacklisted}
          onCheckedChange={(checked) => setValue("blacklisted", checked)}
        />
        <Label htmlFor="blacklisted">Candidato em blacklist</Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : candidate ? "Atualizar" : "Criar"}
        </Button>
      </div>
    </form>
  );
};
