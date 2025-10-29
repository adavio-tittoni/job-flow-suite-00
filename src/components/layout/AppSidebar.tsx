import { Briefcase, Users, LayoutGrid, FileText } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "Pipeline", url: "/pipeline", icon: Briefcase },
  { title: "Vagas", url: "/vacancies", icon: Briefcase },
  { title: "Candidatos", url: "/candidates", icon: Users },
  { title: "Matriz", url: "/matrix", icon: LayoutGrid },
  { title: "Documentos", url: "/documents", icon: FileText },
];

export function AppSidebar() {
  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-20 bg-sidebar border-r border-border flex flex-col items-center py-3 space-y-2">
      {menuItems.map((item) => (
        <NavLink
          key={item.url}
          to={item.url}
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
