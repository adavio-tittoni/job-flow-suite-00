import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./UserMenu";

export function AppHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-card flex items-center justify-between z-50">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" className="lg:hidden ml-4">
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-3 ml-4">
          <h1 className="font-bold text-xl hidden sm:block">CertifAi</h1>
          <div className="flex items-center justify-center w-20 h-16">
            <img 
              src="/Capturar.PNG" 
              alt="Logo" 
              className="h-14 w-14 object-contain object-center"
            />
          </div>
        </div>
      </div>

      <div className="pr-4">
        <UserMenu />
      </div>
    </header>
  );
}
