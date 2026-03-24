import { Menu, Moon, Sun, LogOut, LogIn, Settings } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/components/AuthProvider";

const NAV_ITEMS = [
  { label: "Home", path: "/" },
  { label: "Chats", path: "/chats" },
];

const AppHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user, logout } = useAuth();

  const initials = (user?.displayName || user?.username || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 grid grid-cols-[1fr_auto_1fr] items-center px-4 md:px-8 py-3 bg-background/80 backdrop-blur-sm border-b border-border">
      {/* Logo */}
      <button
        onClick={() => navigate("/")}
        className="justify-self-start text-xl font-bold tracking-tight text-foreground min-h-[44px] flex items-center"
      >
        <span className="text-primary">H</span>uddle
      </button>

      {/* Desktop Nav (centered) */}
      <nav className="hidden md:flex items-center gap-1 justify-center">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              location.pathname === item.path
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="justify-self-end flex items-center gap-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-secondary/80 transition-colors touch-manipulation"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-foreground" />
          ) : (
            <Moon className="h-4 w-4 text-foreground" />
          )}
        </button>

        {/* Auth Controls (desktop) */}
        {isAuthenticated ? (
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-secondary/70 transition-colors touch-manipulation"
              aria-label="Profile"
            >
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground max-w-[100px] truncate">
                {user?.displayName || user?.username}
              </span>
            </button>
            <button
              onClick={() => { logout(); navigate("/"); }}
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors touch-manipulation"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate("/get-started")}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary hover:text-primary/80 rounded-lg hover:bg-primary/10 transition-colors"
          >
            <LogIn className="h-4 w-4" />
            Log in
          </button>
        )}

        {/* Mobile Hamburger */}
        <Sheet>
          <SheetTrigger asChild>
            <button className="md:hidden w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-secondary/80 transition-colors touch-manipulation">
              <Menu className="h-5 w-5 text-foreground" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-background border-border w-[280px] sm:w-[320px]">
            {/* User card if authenticated */}
            {isAuthenticated && user && (
              <button
                onClick={() => navigate("/profile")}
                className="mt-6 mb-2 w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-secondary/50 transition-colors text-left touch-manipulation"
              >
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{user.displayName || user.username}</p>
                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                </div>
              </button>
            )}

            <nav className="flex flex-col gap-1 mt-2">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`text-left text-base py-3 px-3 rounded-xl transition-colors touch-manipulation ${
                    location.pathname === item.path
                      ? "text-primary bg-primary/10 font-semibold"
                      : "text-foreground hover:text-primary hover:bg-secondary/50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <div className="border-t border-border mt-4 pt-4 space-y-1">
                {isAuthenticated ? (
                  <>
                    <button
                      onClick={() => navigate("/profile")}
                      className="flex items-center gap-2 text-left text-base py-3 px-3 rounded-xl text-foreground hover:bg-secondary/50 transition-colors w-full touch-manipulation"
                    >
                      <Settings className="h-5 w-5 text-muted-foreground" />
                      Profile & Settings
                    </button>
                    <button
                      onClick={() => { logout(); navigate("/"); }}
                      className="flex items-center gap-2 text-left text-base py-3 px-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors w-full touch-manipulation"
                    >
                      <LogOut className="h-5 w-5" />
                      Log out
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => navigate("/get-started")}
                    className="flex items-center gap-2 text-left text-base py-3 px-3 rounded-xl text-primary hover:bg-primary/10 transition-colors w-full touch-manipulation"
                  >
                    <LogIn className="h-5 w-5" />
                    Log in
                  </button>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default AppHeader;
