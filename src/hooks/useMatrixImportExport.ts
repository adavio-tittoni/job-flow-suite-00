import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

export const useMatrixImportExport = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const exportMatrix = useMutation({
    mutationFn: async (matrixId: string) => {
      // Buscar dados da matriz
      const { data: matrix, error: matrixError } = await supabase
        .from("matrices")
        .select("*")
        .eq("id", matrixId)
        .single();

      if (matrixError) throw matrixError;

      // Buscar itens da matriz
      const { data: items, error: itemsError } = await supabase
        .from("matrix_items")
        .select(`
          *,
          documents_catalog!matrix_items_document_id_fkey(
            name,
            document_category,
            document_type
          )
        `)
        .eq("matrix_id", matrixId);

      if (itemsError) throw itemsError;

      // Preparar dados para exportação
      const exportData = items?.map(item => ({
        "Versão Matriz": matrix.versao_matriz,
        "Cargo": matrix.cargo,
        "Empresa": matrix.empresa,
        "Solicitado por": matrix.solicitado_por,
        "Usuário": matrix.user_email,
        "Documento": item.documents_catalog?.name || "",
        "Categoria": item.documents_catalog?.document_category || "",
        "Tipo": item.documents_catalog?.document_type || "",
        "Obrigatoriedade": item.obrigatoriedade,
        "Carga Horária": item.carga_horaria || "",
        "Modalidade": item.modalidade || "",
        "Regra de Validade": item.regra_validade || "",
      })) || [];

      // Criar workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Ajustar largura das colunas
      const colWidths = [
        { wch: 15 }, // Versão Matriz
        { wch: 20 }, // Cargo
        { wch: 20 }, // Empresa
        { wch: 20 }, // Solicitado por
        { wch: 25 }, // Usuário
        { wch: 30 }, // Documento
        { wch: 20 }, // Categoria
        { wch: 15 }, // Tipo
        { wch: 15 }, // Obrigatoriedade
        { wch: 12 }, // Carga Horária
        { wch: 15 }, // Modalidade
        { wch: 20 }, // Regra de Validade
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "Matriz");
      
      // Exportar arquivo
      const fileName = `matriz_${matrix.cargo}_${matrix.empresa}_${matrix.versao_matriz || 'v1'}.xlsx`;
      XLSX.writeFile(wb, fileName);
    },
    onSuccess: () => {
      toast({
        title: "Matriz exportada",
        description: "A matriz foi exportada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao exportar matriz",
        description: error.message || "Não foi possível exportar a matriz.",
        variant: "destructive",
      });
    },
  });

  const importMatrix = useMutation({
    mutationFn: async (file: File) => {
      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
              throw new Error("Arquivo vazio ou inválido");
            }

            // Validar estrutura do arquivo
            const requiredFields = ["Cargo", "Empresa", "Documento", "Obrigatoriedade"];
            const firstRow = jsonData[0] as any;
            const missingFields = requiredFields.filter(field => !(field in firstRow));
            
            if (missingFields.length > 0) {
              throw new Error(`Campos obrigatórios ausentes: ${missingFields.join(", ")}`);
            }

            // Processar dados
            const matrices = new Map();
            const matrixItems = [];

            for (const row of jsonData as any[]) {
              const matrixKey = `${row.Cargo}_${row.Empresa}_${row["Versão Matriz"] || "v1"}`;
              
              if (!matrices.has(matrixKey)) {
                matrices.set(matrixKey, {
                  cargo: row.Cargo,
                  empresa: row.Empresa,
                  versao_matriz: row["Versão Matriz"] || "v1",
                  solicitado_por: row["Solicitado por"] || "",
                  user_email: row["Usuário"] || "Sistema",
                });
              }

              // Buscar documento no catálogo
              const { data: document } = await supabase
                .from("documents_catalog")
                .select("id")
                .eq("name", row.Documento)
                .single();

              if (document) {
                matrixItems.push({
                  matrix_key: matrixKey,
                  document_id: document.id,
                  obrigatoriedade: row.Obrigatoriedade,
                  carga_horaria: row["Carga Horária"] ? parseInt(row["Carga Horária"]) : null,
                  modalidade: row.Modalidade || "",
                  regra_validade: row["Regra de Validade"] || "",
                });
              }
            }

            // Inserir matrizes
            const matrixData = Array.from(matrices.values());
            const { data: insertedMatrices, error: matrixError } = await supabase
              .from("matrices")
              .insert(matrixData)
              .select();

            if (matrixError) throw matrixError;

            // Inserir itens das matrizes
            const itemsToInsert = matrixItems.map(item => {
              const matrix = insertedMatrices?.find(m => 
                `${m.cargo}_${m.empresa}_${m.versao_matriz}` === item.matrix_key
              );
              return {
                matrix_id: matrix?.id,
                document_id: item.document_id,
                obrigatoriedade: item.obrigatoriedade,
                carga_horaria: item.carga_horaria,
                modalidade: item.modalidade,
                regra_validade: item.regra_validade,
              };
            }).filter(item => item.matrix_id);

            if (itemsToInsert.length > 0) {
              const { error: itemsError } = await supabase
                .from("matrix_items")
                .insert(itemsToInsert);

              if (itemsError) throw itemsError;
            }

            resolve();
          } catch (error) {
            reject(error);
          }
        };
        reader.readAsArrayBuffer(file);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matrices"] });
      toast({
        title: "Matrizes importadas",
        description: "As matrizes foram importadas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao importar matrizes",
        description: error.message || "Não foi possível importar as matrizes.",
        variant: "destructive",
      });
    },
  });

  return {
    exportMatrix,
    importMatrix,
    isExporting: exportMatrix.isPending,
    isImporting: importMatrix.isPending,
  };
};
