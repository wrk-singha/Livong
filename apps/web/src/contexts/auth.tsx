"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

interface AuthContextType {
  token: string | null;
  userId: string | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  login: (token: string, userId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setToken(localStorage.getItem("token"));
    setUserId(localStorage.getItem("userId"));
    setHydrated(true);
  }, []);

  const login = useCallback((t: string, u: string) => {
    localStorage.setItem("token", t);
    localStorage.setItem("userId", u);
    setToken(t);
    setUserId(u);
  }, []);

  // No navigation here. AppShell owns the unauth → public-route redirect via
  // its useEffect; routing from two places caused a race where router.push("/login")
  // here and router.replace("/") in AppShell fired together and "/" won.
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    setToken(null);
    setUserId(null);
    // Tear down the chat WebSocket so the next user doesn't inherit a
    // connection authenticated as the previous one. Lazy-import to avoid
    // pulling partysocket into the auth bundle on first paint.
    import("@/lib/ws").then((m) => m.disconnect()).catch(() => {});
  }, []);

  return (
    <AuthContext.Provider
      value={{ token, userId, isAuthenticated: !!token, hydrated, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
