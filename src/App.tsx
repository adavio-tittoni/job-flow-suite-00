import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import Auth from "./pages/Auth";
import Pipeline from "./pages/Pipeline";
import Vacancies from "./pages/Vacancies";
import VacancyEditor from "./pages/VacancyEditor";
import Users from "./pages/Users";
import UserEditor from "./pages/UserEditor";
import Candidates from "./pages/Candidates";
import CandidateDetail from "./pages/CandidateDetail";
import ImportDocuments from "./pages/ImportDocuments";
import Matrix from "./pages/Matrix";
import Documents from "./pages/Documents";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Navigate to="/pipeline" replace />} />
            <Route path="/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
            <Route path="/vacancies" element={<ProtectedRoute><Vacancies /></ProtectedRoute>} />
            <Route path="/vacancies/new" element={<ProtectedRoute><VacancyEditor /></ProtectedRoute>} />
            <Route path="/vacancies/:id" element={<ProtectedRoute><VacancyEditor /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
            <Route path="/users/new" element={<ProtectedRoute><UserEditor /></ProtectedRoute>} />
            <Route path="/users/:id" element={<ProtectedRoute><UserEditor /></ProtectedRoute>} />
            <Route path="/candidates" element={<ProtectedRoute><Candidates /></ProtectedRoute>} />
            <Route path="/candidates/:id" element={<ProtectedRoute><CandidateDetail /></ProtectedRoute>} />
            <Route path="/candidates/:id/import-documents" element={<ProtectedRoute><ImportDocuments /></ProtectedRoute>} />
            <Route path="/matrix" element={<ProtectedRoute><Matrix /></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
