import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CandidatesList } from "@/components/candidates/CandidatesList";

export default function Candidates() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Candidatos</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie e acompanhe todos os candidatos do sistema.
        </p>
      </div>

      <CandidatesList />
    </div>
  );
}
