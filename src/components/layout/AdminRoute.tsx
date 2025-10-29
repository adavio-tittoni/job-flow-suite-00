import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Verificar se o usuário é administrador ou superadministrador
  if (user?.role !== "administrador" && user?.role !== "superadministrador") {
    return <Navigate to="/pipeline" replace />;
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
