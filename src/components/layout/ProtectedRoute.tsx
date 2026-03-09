import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  // Wait for auth to finish loading before making routing decisions
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <AppSidebar />
      <main className="ml-20 mt-16 p-8">
        <div className="container mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
