import { useCallback } from "react";
import { Briefcase, Users, LayoutGrid, FileText } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { usePrefetch } from "@/hooks/usePrefetch";

const baseItems = [
  { title: "Pipeline", url: "/pipeline", icon: Briefcase, prefetchKey: "pipeline" },
  { title: "Vagas", url: "/vacancies", icon: Briefcase, prefetchKey: "vacancies" },
  { title: "Candidatos", url: "/candidates", icon: Users, prefetchKey: "candidates" },
] as const;

const adminItems = [
  { title: "Matriz", url: "/matrix", icon: LayoutGrid, prefetchKey: "matrices" },
  { title: "Documentos", url: "/documents", icon: FileText, prefetchKey: "documentsCatalog" },
] as const;

type PrefetchKey = "pipeline" | "vacancies" | "candidates" | "matrices" | "documentsCatalog";

export function AppSidebar() {
  const { user } = useAuth();
  const { 
    prefetchPipeline, 
    prefetchVacancies, 
    prefetchCandidates, 
    prefetchMatrices, 
    prefetchDocumentsCatalog 
  } = usePrefetch();
  
  const isAdmin = user?.role === "administrador" || user?.role === "superadministrador";
  const menuItems = isAdmin ? [...baseItems, ...adminItems] : [...baseItems];

  // Map prefetch keys to functions
  const prefetchMap: Record<PrefetchKey, () => void> = {
    pipeline: prefetchPipeline,
    vacancies: prefetchVacancies,
    candidates: prefetchCandidates,
    matrices: prefetchMatrices,
    documentsCatalog: prefetchDocumentsCatalog,
  };

  // Handle prefetch on mouse enter
  const handleMouseEnter = useCallback((prefetchKey: PrefetchKey) => {
    prefetchMap[prefetchKey]?.();
  }, [prefetchMap]);

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-20 bg-sidebar border-r border-border flex flex-col items-center py-3 space-y-2">
      {menuItems.map((item) => (
        <NavLink
          key={item.url}
          to={item.url}
          onMouseEnter={() => handleMouseEnter(item.prefetchKey)}
          onFocus={() => handleMouseEnter(item.prefetchKey)}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center w-full min-h-16 p-3 text-sidebar-foreground transition-colors rounded-md",
              isActive ? "bg-primary text-primary-foreground" : "hover:bg-sidebar-accent"
            )
          }
        >
          <item.icon className="h-5 w-5 mb-1" />
          <span className="text-[10px] text-center leading-tight">{item.title}</span>
        </NavLink>
      ))}
    </aside>
  );
}
