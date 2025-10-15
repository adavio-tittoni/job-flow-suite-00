import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCandidateHistory, type CandidateHistory } from "@/hooks/useCandidates";
import { useToast } from "@/hooks/use-toast";

interface CandidateHistoryFormProps {
  candidateId: string;
  historyEntry?: CandidateHistory | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const historySchema = z.object({
  event_date: z.string().min(1, "Data do evento é obrigatória"),
  description: z.string().optional(),
  vacancy_id: z.string().optional(),
  approved: z.boolean().optional(),
});

type HistoryFormData = z.infer<typeof historySchema>;

export const CandidateHistoryForm = ({ candidateId, historyEntry, onSuccess, onCancel }: CandidateHistoryFormProps) => {
  const { createHistoryEntry, updateHistoryEntry } = useCandidateHistory(candidateId);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<HistoryFormData>({
    resolver: zodResolver(historySchema),
    defaultValues: {
      event_date: historyEntry?.event_date ? historyEntry.event_date.split('T')[0] : "",
      description: historyEntry?.description || "",
      vacancy_id: historyEntry?.vacancy_id || "",
      approved: historyEntry?.approved,
    },
  });

  const onSubmit = async (data: HistoryFormData) => {
    try {
      const formattedData = {
        ...data,
        event_date: new Date(data.event_date + 'T12:00:00.000Z').toISOString(),
        vacancy_id: data.vacancy_id || undefined,
      };

      if (historyEntry) {
        await updateHistoryEntry.mutateAsync({ id: historyEntry.id, ...formattedData });
      } else {
        await createHistoryEntry.mutateAsync(formattedData);
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar evento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="event_date">Data do Evento *</Label>
        <Input
          id="event_date"
          type="date"
          {...register("event_date")}
        />
        {errors.event_date && (
          <p className="text-sm text-red-500 mt-1">{errors.event_date.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Descreva o evento..."
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="vacancy_id">Vaga Relacionada</Label>
        <Input
          id="vacancy_id"
          {...register("vacancy_id")}
          placeholder="ID da vaga (opcional)"
        />
      </div>

      <div>
        <Label htmlFor="approved">Status</Label>
        <Select
          value={watch("approved") === undefined ? "pending" : watch("approved") ? "approved" : "rejected"}
          onValueChange={(value) => {
            if (value === "pending") {
              setValue("approved", undefined);
            } else {
              setValue("approved", value === "approved");
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="approved">Aprovado</SelectItem>
            <SelectItem value="rejected">Reprovado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : historyEntry ? "Atualizar" : "Criar"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
};
