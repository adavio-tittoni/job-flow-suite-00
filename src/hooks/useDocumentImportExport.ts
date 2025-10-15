import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";

export const useDocumentImportExport = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const exportTemplate = useMutation({
    mutationFn: async () => {
      const template = [
        {
          categoria: "Certificação",
          document_category: "Técnica",
          document_type: "Certificado",
          name: "Nome do Documento",
          detail: "Descrição detalhada"
        }
      ];

      const csv = Papa.unparse(template);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'modelo_documentos.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    onSuccess: () => {
      toast({
        title: "Modelo exportado",
        description: "O modelo CSV foi baixado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao exportar modelo",
        description: "Não foi possível exportar o modelo.",
        variant: "destructive",
      });
    },
  });

  const importDocuments = useMutation({
    mutationFn: async (file: File) => {
      return new Promise<void>((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            try {
              const documents = results.data.map((row: any) => ({
                categoria: row.categoria || "",
                document_category: row.document_category || "",
                document_type: row.document_type || "",
                name: row.name || "",
                detail: row.detail || "",
              }));

              // Validate required fields
              const invalidDocs = documents.filter(doc => !doc.name);
              if (invalidDocs.length > 0) {
                throw new Error("Alguns documentos não possuem nome. Verifique o arquivo CSV.");
              }

              // Check for duplicates
              const { data: existingDocs } = await supabase
                .from("documents_catalog")
                .select("name");

              const existingNames = existingDocs?.map(doc => doc.name.toLowerCase()) || [];
              const duplicateNames = documents
                .map(doc => doc.name.toLowerCase())
                .filter(name => existingNames.includes(name));

              if (duplicateNames.length > 0) {
                throw new Error(`Documentos duplicados encontrados: ${duplicateNames.join(", ")}`);
              }

              // Insert documents
              const { error } = await supabase
                .from("documents_catalog")
                .insert(documents);

              if (error) throw error;

              resolve();
            } catch (error) {
              reject(error);
            }
          },
          error: (error) => {
            reject(new Error(`Erro ao processar arquivo CSV: ${error.message}`));
          },
        });
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast({
        title: "Documentos importados",
        description: "Os documentos foram importados com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao importar documentos",
        description: error.message || "Não foi possível importar os documentos.",
        variant: "destructive",
      });
    },
  });

  return {
    exportTemplate,
    importDocuments,
    isExporting: exportTemplate.isPending,
    isImporting: importDocuments.isPending,
  };
};
