import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

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
