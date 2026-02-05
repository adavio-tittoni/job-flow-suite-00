import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { UploadQueueProvider } from "@/contexts/UploadQueueContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AdminRoute } from "@/components/layout/AdminRoute";

// Lazy load pages for code splitting - reduces initial bundle size
const Auth = lazy(() => import("./pages/Auth"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const Vacancies = lazy(() => import("./pages/Vacancies"));
const VacancyEditor = lazy(() => import("./pages/VacancyEditor"));
const Users = lazy(() => import("./pages/Users"));
const UserEditor = lazy(() => import("./pages/UserEditor"));
const Candidates = lazy(() => import("./pages/Candidates"));
const CandidateDetail = lazy(() => import("./pages/CandidateDetail"));
const ImportDocuments = lazy(() => import("./pages/ImportDocuments"));
const MatrixCreator = lazy(() => import("./pages/MatrixCreator"));
const MatrixEditor = lazy(() => import("./pages/MatrixEditor"));
const Matrix = lazy(() => import("./pages/Matrix"));
const Documents = lazy(() => import("./pages/Documents"));
const Profile = lazy(() => import("./pages/Profile"));
const Help = lazy(() => import("./pages/Help"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Configure QueryClient with optimized caching strategy
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data remains fresh for 2 minutes - no refetch during this time
      staleTime: 1000 * 60 * 2,
      // Cache data for 10 minutes even after component unmounts
      gcTime: 1000 * 60 * 10,
      // Retry failed requests up to 2 times
      retry: 2,
      // Disable refetch on window focus for better UX
      refetchOnWindowFocus: false,
      // Enable refetch on reconnect
      refetchOnReconnect: true,
      // Don't refetch on mount if data is fresh
      refetchOnMount: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <UploadQueueProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<Navigate to="/pipeline" replace />} />
              <Route path="/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
              <Route path="/vacancies" element={<ProtectedRoute><Vacancies /></ProtectedRoute>} />
              <Route path="/vacancies/new" element={<ProtectedRoute><VacancyEditor /></ProtectedRoute>} />
              <Route path="/vacancies/:id" element={<ProtectedRoute><VacancyEditor /></ProtectedRoute>} />
              <Route path="/users" element={<AdminRoute><Users /></AdminRoute>} />
              <Route path="/users/new" element={<AdminRoute><UserEditor /></AdminRoute>} />
              <Route path="/users/:id" element={<AdminRoute><UserEditor /></AdminRoute>} />
              <Route path="/candidates" element={<ProtectedRoute><Candidates /></ProtectedRoute>} />
              <Route path="/candidates/:id" element={<ProtectedRoute><CandidateDetail /></ProtectedRoute>} />
              <Route path="/candidates/:id/import-documents" element={<ProtectedRoute><ImportDocuments /></ProtectedRoute>} />
              <Route path="/matrix" element={<AdminRoute><Matrix /></AdminRoute>} />
              <Route path="/matrix/new" element={<AdminRoute><MatrixCreator /></AdminRoute>} />
              <Route path="/matrix/:id" element={<AdminRoute><MatrixEditor /></AdminRoute>} />
              <Route path="/documents" element={<AdminRoute><Documents /></AdminRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </UploadQueueProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
