import { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, Eye, ExternalLink, RefreshCw, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { usePaginatedCandidates } from "@/hooks/usePaginatedCandidates";
import type { Candidate } from "@/hooks/useCandidates";
import { CandidateForm } from "./CandidateForm";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { updateCandidateDocumentCodes } from "@/utils/updateCandidateDocumentCodes";

// Debounce hook for search optimization
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export const CandidatesList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isUpdatingCodes, setIsUpdatingCodes] = useState(false);
  const [pageSize, setPageSize] = useState(20);

  // Debounce search to avoid excessive API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Use paginated hook with server-side filtering
  const {
    candidates,
    isLoading,
    isFetching,
    pagination,
    goToPage,
    resetPage,
    prefetchNextPage,
    deleteCandidate,
  } = usePaginatedCandidates({
    pageSize,
    searchTerm: debouncedSearchTerm,
  });

  // Reset to page 1 when search changes
  useEffect(() => {
    resetPage();
  }, [debouncedSearchTerm, resetPage]);

  // Prefetch next page on hover for instant navigation
  const handleMouseEnterNextPage = useCallback(() => {
    prefetchNextPage();
  }, [prefetchNextPage]);

  // Handle page size change
  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    resetPage();
  }, [resetPage]);

  const formatWhatsAppLink = (phone: string) => {
    if (!phone) return null;
    // Remove all non-numeric characters
    const cleanPhone = phone.replace(/\D/g, '');
    // Add country code if not present
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    
    // Check if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      return `https://wa.me/${formattedPhone}`;
    } else {
      return `https://web.whatsapp.com/send?phone=${formattedPhone}`;
    }
  };


  const handleEdit = (candidate: Candidate) => {
    navigate(`/candidates/${candidate.id}?tab=documents`);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este candidato?")) {
      await deleteCandidate.mutateAsync(id);
    }
  };

  const handleView = (candidate: Candidate) => {
    navigate(`/candidates/${candidate.id}?tab=documents`);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedCandidate(null);
  };

  const handleUpdateCodes = async () => {
    setIsUpdatingCodes(true);
    try {
      const result = await updateCandidateDocumentCodes();
      if (result.success) {
        toast({
          title: "Sucesso",
          description: `${result.updatedCount} documentos atualizados com códigos do catálogo.`,
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao atualizar códigos dos documentos.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar códigos dos documentos.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingCodes(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Lista de Candidatos
            {isFetching && !isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative max-w-sm">
              <Input
                placeholder="Buscar candidatos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {isFetching && searchTerm && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleUpdateCodes}
                disabled={isUpdatingCodes}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isUpdatingCodes ? 'animate-spin' : ''}`} />
                {isUpdatingCodes ? 'Atualizando...' : 'Atualizar Códigos'}
              </Button>
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setSelectedCandidate(null)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Candidato
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {selectedCandidate ? "Editar Candidato" : "Novo Candidato"}
                  </DialogTitle>
                </DialogHeader>
                <CandidateForm
                  candidate={selectedCandidate}
                  onSuccess={handleFormClose}
                  onCancel={handleFormClose}
                  compact={!selectedCandidate}
                />
              </DialogContent>
            </Dialog>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Vaga</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando candidatos...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : candidates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      {searchTerm ? "Nenhum candidato encontrado para a busca" : "Nenhum candidato cadastrado"}
                    </TableCell>
                  </TableRow>
                ) : (
                  candidates.map((candidate) => (
                    <TableRow key={candidate.id}>
                      <TableCell className="font-medium">
                        {candidate.name}
                        {candidate.blacklisted && (
                          <Badge variant="destructive" className="ml-2">
                            Blacklist
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{candidate.email || "-"}</TableCell>
                      <TableCell>
                        {candidate.phones ? (
                          <a
                            href={formatWhatsAppLink(candidate.phones) || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 underline inline-flex items-center gap-1"
                          >
                            {candidate.phones}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{candidate.vacancy_title || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(candidate)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(candidate)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(candidate.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalCount > 0 && (
            <div onMouseEnter={handleMouseEnterNextPage}>
              <Pagination
                page={pagination.page}
                pageSize={pagination.pageSize}
                totalCount={pagination.totalCount}
                totalPages={pagination.totalPages}
                isLoading={isFetching}
                onPageChange={goToPage}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
