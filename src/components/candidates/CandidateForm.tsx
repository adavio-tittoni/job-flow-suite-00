import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCandidates, type Candidate } from "@/hooks/useCandidates";
import { useToast } from "@/hooks/use-toast";

const candidateSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phones: z.string().optional(),
  cpf: z.string().optional(),
  role_title: z.string().optional(),
  linkedin_url: z.string().optional(),
  working_status: z.string().optional(),
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      role_title: candidate?.role_title || "",
      linkedin_url: candidate?.linkedin_url || "",
      working_status: candidate?.working_status || "",
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

  const onSubmit = async (data: CandidateFormData) => {
    setIsSubmitting(true);
    try {
      const normalizedData = {
        ...data,
        linkedin_url: data.linkedin_url ? normalizeLinkedInUrl(data.linkedin_url) : "",
        email: data.email || null,
      };

      if (candidate) {
        await updateCandidate.mutateAsync({ id: candidate.id, ...normalizedData });
      } else {
        await createCandidate.mutateAsync(normalizedData);
      }
      onSuccess();
    } catch (error) {
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
          <Label htmlFor="name">Nome *</Label>
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
            {...register("phones")}
            placeholder="(11) 99999-9999"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cpf">CPF</Label>
          <Input
            id="cpf"
            {...register("cpf")}
            placeholder="000.000.000-00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role_title">Cargo Desejado</Label>
          <Input
            id="role_title"
            {...register("role_title")}
            placeholder="Cargo pretendido"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="linkedin_url">LinkedIn</Label>
          <Input
            id="linkedin_url"
            {...register("linkedin_url")}
            placeholder="linkedin.com/in/usuario"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="working_status">Status de Trabalho</Label>
          <Select onValueChange={(value) => setValue("working_status", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Trabalhando">Trabalhando</SelectItem>
              <SelectItem value="Disponível">Disponível</SelectItem>
              <SelectItem value="Não disponível">Não disponível</SelectItem>
            </SelectContent>
          </Select>
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
