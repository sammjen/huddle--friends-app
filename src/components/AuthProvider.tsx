import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "@/lib/api";

interface User {
  id: number;
  username: string;
  displayName: string;
  city?: string | null;
  role: "user" | "admin";
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("huddle-user");
    return stored ? JSON.parse(stored) : null;
  });

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("huddle-user");
  }, []);

  const login = (userData: User) => {
    const payload = { ...userData };
    setUser(payload);
    localStorage.setItem("huddle-user", JSON.stringify(payload));
  };

  const verifyAccountActive = useCallback(
    (current: User) => {
      fetch(apiUrl(`/api/auth/verify?userId=${current.id}`))
        .then((r) => {
          if (!r.ok) throw new Error("verify failed");
          return r.json();
        })
        .then((data: { active?: number; username?: string }) => {
          if (data.active === 0) {
            logout();
            navigate(
              `/account-deactivated?username=${encodeURIComponent(data.username || current.username)}`,
              { replace: true }
            );
          }
        })
        .catch(() => {});
    },
    [logout, navigate]
  );

  useEffect(() => {
    if (!user) return;
    verifyAccountActive(user);
  }, [user?.id, verifyAccountActive, user]);

  useEffect(() => {
    if (!user) return;
    const onFocus = () => verifyAccountActive(user);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user, verifyAccountActive]);

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
