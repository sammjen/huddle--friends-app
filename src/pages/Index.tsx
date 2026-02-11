import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-black text-foreground tracking-tight">BB</h1>
          <p className="text-xl text-muted-foreground max-w-xs mx-auto">
            Connect with people who get it. No more lonely nights.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button
            onClick={() => navigate("/get-started")}
            className="w-full h-14 text-lg font-semibold rounded-xl"
          >
            Get Started
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate("/chats")}
            className="w-full h-14 text-lg font-semibold rounded-xl"
          >
            View Chats
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Index;
