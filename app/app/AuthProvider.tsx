"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { AppRole } from "@/lib/auth/roles";
import { hasWriteAccess } from "@/lib/auth/roles";

type AuthContextValue = {
  user: User | null;
  role: AppRole;
  canWrite: boolean;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  canWrite: true,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    let isMounted = true;

    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();
      if (!isMounted) return;

      if (error) {
        console.error("Error loading auth user", error);
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      const currentUser = data.user ?? null;
      setUser(currentUser);

      const metaRole =
        (currentUser?.user_metadata?.role as string | undefined) ?? null;

      setRole(metaRole);
      setLoading(false);
    }

    loadUser();

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      const metaRole =
        (nextUser?.user_metadata?.role as string | undefined) ?? null;
      setRole(metaRole);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    user,
    role,
    canWrite: hasWriteAccess(role),
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

