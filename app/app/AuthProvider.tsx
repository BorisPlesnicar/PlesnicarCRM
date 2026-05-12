"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { AppRole } from "@/lib/auth/roles";
import { hasWriteAccess } from "@/lib/auth/roles";

function isSupabaseLockAbort(err: unknown): boolean {
  const e = err as { name?: string; message?: string } | null;
  if (!e) return false;
  const msg = String(e.message || "").toLowerCase();
  if (e.name === "AbortError") return true;
  return (
    msg.includes("lock was stolen") ||
    msg.includes("was released because another request stole it") ||
    (msg.includes("lock") && msg.includes("auth-token"))
  );
}

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

  // Ensure we never create multiple auth clients/subscriptions per tab.
  const supabase = useMemo(() => createClient(), []);

  // Swallow Supabase navigator-lock "stolen" rejections. They are benign races
  // between tabs/HMR reloads and not actionable for the user.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isSupabaseLockAbort(event.reason)) {
        event.preventDefault();
      }
    };
    const onError = (event: ErrorEvent) => {
      if (isSupabaseLockAbort(event.error)) {
        event.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!isMounted) return;

        if (error) {
          if (isSupabaseLockAbort(error)) return;
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
      } catch (err) {
        if (!isMounted) return;
        if (isSupabaseLockAbort(err)) return;
        console.error("Error loading auth user", err);
        setUser(null);
        setRole(null);
        setLoading(false);
      }
    }

    loadUser();

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange((_event: unknown, session: { user?: User } | null) => {
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
  }, [supabase]);

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

