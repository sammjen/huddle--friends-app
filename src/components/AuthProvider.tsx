import { createContext, useContext, useState, type ReactNode } from "react";

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
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("huddle-user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = (userData: User) => {
    const payload = { ...userData };
    setUser(payload);
    localStorage.setItem("huddle-user", JSON.stringify(payload));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("huddle-user");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
