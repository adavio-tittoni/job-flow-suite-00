import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./UserMenu";

export function AppHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border flex items-center justify-between px-4 z-50">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">C</span>
          </div>
          <h1 className="font-bold text-xl hidden sm:block">CertifAi</h1>
        </div>
      </div>

      <UserMenu />
    </header>
  );
}
