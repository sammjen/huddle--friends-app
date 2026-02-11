import { Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const AppHeader = () => {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-primary/30">
      <button onClick={() => navigate("/")} className="text-foreground text-3xl font-black tracking-tighter">
        BB
      </button>
      <Sheet>
        <SheetTrigger asChild>
          <button className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center">
            <Menu className="h-5 w-5 text-background" />
          </button>
        </SheetTrigger>
        <SheetContent className="bg-secondary border-border">
          <nav className="flex flex-col gap-4 mt-8">
            <button onClick={() => navigate("/")} className="text-left text-lg text-foreground hover:text-primary transition-colors py-2">
              Home
            </button>
            <button onClick={() => navigate("/get-started")} className="text-left text-lg text-foreground hover:text-primary transition-colors py-2">
              Get Started
            </button>
            <button onClick={() => navigate("/personality-test")} className="text-left text-lg text-foreground hover:text-primary transition-colors py-2">
              Personality Test
            </button>
            <button onClick={() => navigate("/chats")} className="text-left text-lg text-foreground hover:text-primary transition-colors py-2">
              Chats
            </button>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
};

export default AppHeader;
