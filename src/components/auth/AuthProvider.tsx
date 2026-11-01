"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type AppRole = "user" | "pro" | "admin";

export type AuthUser = {
  id: string;
  email: string;
  role: AppRole;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toRole(user: User): AppRole {
  const roleValue =
    (typeof user.app_metadata?.role === "string" ? user.app_metadata.role : null) ??
    (typeof user.user_metadata?.role === "string" ? user.user_metadata.role : null) ??
    "user";

  return roleValue === "admin" || roleValue === "pro" ? roleValue : "user";
}

function toAuthUser(user: User | null): AuthUser | null {
  if (!user?.id || !user.email) return null;
  return {
    id: user.id,
    email: user.email,
    role: toRole(user),
  };
}

export function AuthProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: User | null;
}) {
  const [user, setUser] = useState<AuthUser | null>(() => toAuthUser(initialUser));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase?.auth?.onAuthStateChange) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string, session: { user?: User | null } | null) => {
      setUser(toAuthUser(session?.user ?? null));
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      signOut: async () => {
        const supabase = createClient();
        setIsLoading(true);
        try {
          await supabase.auth.signOut();
        } finally {
          setIsLoading(false);
        }
      },
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}

