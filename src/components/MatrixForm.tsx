import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateMatrix, useUpdateMatrix, type Matrix } from "@/hooks/useMatrix";
import { useToast } from "@/hooks/use-toast";

const matrixSchema = z.object({
  cargo: z.string().min(1, "Cargo é obrigatório"),
  empresa: z.string().min(1, "Empresa é obrigatória"),
  solicitado_por: z.string().min(1, "Solicitado por é obrigatório"),
  versao_matriz: z.string().min(1, "Versão é obrigatória"),
  user_email: z.string().email("Email inválido"),
});

type MatrixFormData = z.infer<typeof matrixSchema>;

interface MatrixFormProps {
  matrix?: Matrix | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MatrixForm = ({ matrix, isOpen, onClose }: MatrixFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createMatrix = useCreateMatrix();
  const updateMatrix = useUpdateMatrix();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<MatrixFormData>({
    resolver: zodResolver(matrixSchema),
    defaultValues: matrix ? {
      cargo: matrix.cargo,
      empresa: matrix.empresa,
      solicitado_por: matrix.solicitado_por,
      versao_matriz: matrix.versao_matriz,
      user_email: matrix.user_email,
    } : {
      cargo: "",
      empresa: "",
      solicitado_por: "",
      versao_matriz: "1",
      user_email: "",
    },
  });

  const onSubmit = async (data: MatrixFormData) => {
    setIsSubmitting(true);
    try {
      if (matrix) {
        await updateMatrix.mutateAsync({ id: matrix.id, ...data });
        toast({
          title: "Matriz atualizada",
          description: "A matriz foi atualizada com sucesso.",
        });
      } else {
        await createMatrix.mutateAsync(data);
        toast({
          title: "Matriz criada",
          description: "A matriz foi criada com sucesso.",
        });
      }
      reset();
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar a matriz.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {matrix ? "Editar Matriz" : "Nova Matriz"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="empresa">Empresa</Label>
            <Input
              id="empresa"
              {...register("empresa")}
              placeholder="Nome da empresa"
            />
            {errors.empresa && (
              <p className="text-sm text-destructive">{errors.empresa.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cargo">Cargo</Label>
            <Input
              id="cargo"
              {...register("cargo")}
              placeholder="Nome do cargo"
            />
            {errors.cargo && (
              <p className="text-sm text-destructive">{errors.cargo.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="solicitado_por">Solicitado por</Label>
            <Input
              id="solicitado_por"
              {...register("solicitado_por")}
              placeholder="Nome de quem solicitou"
            />
            {errors.solicitado_por && (
              <p className="text-sm text-destructive">{errors.solicitado_por.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="versao_matriz">Versão da Matriz</Label>
            <Input
              id="versao_matriz"
              {...register("versao_matriz")}
              placeholder="Ex: 1.0"
            />
            {errors.versao_matriz && (
              <p className="text-sm text-destructive">{errors.versao_matriz.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="user_email">Email do Responsável</Label>
            <Input
              id="user_email"
              type="email"
              {...register("user_email")}
              placeholder="email@exemplo.com"
            />
            {errors.user_email && (
              <p className="text-sm text-destructive">{errors.user_email.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : matrix ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
