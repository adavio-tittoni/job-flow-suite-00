import { useState } from "react";
import { Plus, Edit, Trash2, Eye, ExternalLink, Linkedin, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useCandidates, type Candidate } from "@/hooks/useCandidates";
import { CandidateForm } from "./CandidateForm";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { updateCandidateDocumentCodes } from "@/utils/updateCandidateDocumentCodes";

export const CandidatesList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { candidates, isLoading, deleteCandidate } = useCandidates();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isUpdatingCodes, setIsUpdatingCodes] = useState(false);

  const filteredCandidates = candidates.filter((candidate) =>
    candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.phones?.includes(searchTerm) ||
    candidate.linkedin_url?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const normalizeLinkedInUrl = (url: string) => {
    if (!url) return null;
    // If it's already a full URL, return as is
    if (url.startsWith('http')) return url;
    // If it starts with linkedin.com, add https://
    if (url.startsWith('linkedin.com')) return `https://${url}`;
    // If it's just the profile part, build the full URL
    if (url.startsWith('/in/')) return `https://linkedin.com${url}`;
    // If it's just the username, build the full URL
    return `https://linkedin.com/in/${url}`;
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

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Carregando candidatos...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lista de Candidatos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
              placeholder="Buscar candidatos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
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
                  <TableHead>LinkedIn</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCandidates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Nenhum candidato encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCandidates.map((candidate) => (
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
                            href={formatWhatsAppLink(candidate.phones)}
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
                      <TableCell>
                        {candidate.linkedin_url ? (
                          <a
                            href={normalizeLinkedInUrl(candidate.linkedin_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 inline-flex items-center"
                          >
                            <Linkedin className="h-4 w-4" />
                          </a>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{candidate.role_title || "-"}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
};
