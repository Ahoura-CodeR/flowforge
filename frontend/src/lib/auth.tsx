"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, setUnauthorizedHandler, tokenStore } from "./api";
import type { User } from "./types";

type AuthState =
  | { status: "loading"; user: null }
  | { status: "anonymous"; user: null }
  | { status: "authenticated"; user: User };

interface AuthContextValue {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthResponse {
  accessToken: string;
  user: User;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: "loading", user: null });

  const logout = useCallback(() => {
    tokenStore.clear();
    queryClient.clear(); // never show the previous user's data to the next one
    setState({ status: "anonymous", user: null });
  }, [queryClient]);

  // Restore the session on first load.
  useEffect(() => {
    setUnauthorizedHandler(logout);

    async function restore() {
      if (!tokenStore.get()) {
        setState({ status: "anonymous", user: null });
        return;
      }
      try {
        const user = await api<User>("/auth/me");
        setState({ status: "authenticated", user });
      } catch {
        tokenStore.clear();
        setState({ status: "anonymous", user: null });
      }
    }
    void restore();

    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const startSession = useCallback((response: AuthResponse) => {
    tokenStore.set(response.accessToken);
    setState({ status: "authenticated", user: response.user });
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      startSession(await api<AuthResponse>("/auth/login", { method: "POST", body: { email, password } }));
    },
    [startSession],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      startSession(
        await api<AuthResponse>("/auth/register", { method: "POST", body: { name, email, password } }),
      );
    },
    [startSession],
  );

  const value = useMemo(() => ({ state, login, register, logout }), [state, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
