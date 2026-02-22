"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Rate limiting configuration
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const DELAY_BASE = 1000; // Base delay of 1 second, increases with attempts

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const router = useRouter();
  const supabase = createClient();
  const attemptsRef = useRef<number>(0);
  const lockoutRef = useRef<number | null>(null);

  // Load attempts and lockout from localStorage on mount
  useEffect(() => {
    const storedAttempts = localStorage.getItem("login_attempts");
    const storedLockout = localStorage.getItem("login_lockout_until");
    
    if (storedAttempts) {
      attemptsRef.current = parseInt(storedAttempts, 10);
      setAttempts(attemptsRef.current);
    }
    
    if (storedLockout) {
      const lockoutTime = parseInt(storedLockout, 10);
      if (lockoutTime > Date.now()) {
        lockoutRef.current = lockoutTime;
        setLockoutUntil(lockoutTime);
      } else {
        localStorage.removeItem("login_lockout_until");
        localStorage.removeItem("login_attempts");
        attemptsRef.current = 0;
        setAttempts(0);
      }
    }
  }, []);

  // Update remaining time countdown
  useEffect(() => {
    if (!lockoutUntil) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, lockoutUntil - Date.now());
      setRemainingTime(remaining);

      if (remaining === 0) {
        setLockoutUntil(null);
        lockoutRef.current = null;
        localStorage.removeItem("login_lockout_until");
        localStorage.removeItem("login_attempts");
        attemptsRef.current = 0;
        setAttempts(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutUntil]);

  // Format remaining time
  const formatRemainingTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    // Check if account is locked
    if (lockoutUntil && lockoutUntil > Date.now()) {
      toast.error("Account gesperrt", {
        description: `Bitte warten Sie ${formatRemainingTime(remainingTime)} Minuten.`,
      });
      return;
    }

    // Check if max attempts reached
    if (attemptsRef.current >= MAX_ATTEMPTS) {
      const lockoutTime = Date.now() + LOCKOUT_DURATION;
      lockoutRef.current = lockoutTime;
      setLockoutUntil(lockoutTime);
      localStorage.setItem("login_lockout_until", lockoutTime.toString());
      toast.error("Zu viele fehlgeschlagene Versuche", {
        description: `Ihr Account wurde für 15 Minuten gesperrt.`,
      });
      return;
    }

    setLoading(true);

    // Add progressive delay based on attempts
    if (attemptsRef.current > 0) {
      const delay = DELAY_BASE * Math.pow(2, attemptsRef.current - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Increment attempts
      const newAttempts = attemptsRef.current + 1;
      attemptsRef.current = newAttempts;
      setAttempts(newAttempts);
      localStorage.setItem("login_attempts", newAttempts.toString());

      // Check if we should lock the account
      if (newAttempts >= MAX_ATTEMPTS) {
        const lockoutTime = Date.now() + LOCKOUT_DURATION;
        lockoutRef.current = lockoutTime;
        setLockoutUntil(lockoutTime);
        localStorage.setItem("login_lockout_until", lockoutTime.toString());
        toast.error("Zu viele fehlgeschlagene Versuche", {
          description: `Ihr Account wurde für 15 Minuten gesperrt.`,
        });
      } else {
        const remainingAttempts = MAX_ATTEMPTS - newAttempts;
        toast.error("Login fehlgeschlagen", {
          description: `Falsche Anmeldedaten. Noch ${remainingAttempts} Versuch${remainingAttempts > 1 ? "e" : ""} verbleibend.`,
        });
      }
      setLoading(false);
    } else {
      // Reset attempts on successful login
      attemptsRef.current = 0;
      setAttempts(0);
      localStorage.removeItem("login_attempts");
      localStorage.removeItem("login_lockout_until");
      toast.success("Erfolgreich eingeloggt");
      router.push("/app");
      router.refresh();
    }
  }

  const isLocked = lockoutUntil !== null && lockoutUntil > Date.now();
  const remainingAttempts = MAX_ATTEMPTS - attempts;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="text-center">
          {/* Logo */}
          <img
            src="/LogoTEXTB.png"
            alt="Plesnicar Solutions"
            className="mx-auto mb-4 h-14 object-contain"
          />
          <CardTitle className="text-2xl font-bold text-foreground">
            Plesnicar CRM
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Melden Sie sich in Ihrem CRM an
          </p>
        </CardHeader>
        <CardContent>
          {isLocked && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Ihr Account wurde aufgrund zu vieler fehlgeschlagener Versuche gesperrt.
                Bitte versuchen Sie es in {formatRemainingTime(remainingTime)} erneut.
              </AlertDescription>
            </Alert>
          )}

          {!isLocked && attempts > 0 && (
            <Alert variant="default" className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                {remainingAttempts > 0
                  ? `Noch ${remainingAttempts} Versuch${remainingAttempts > 1 ? "e" : ""} verbleibend.`
                  : "Letzter Versuch vor der Sperrung."}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@beispiel.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-secondary"
                disabled={isLocked || loading}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-secondary"
                disabled={isLocked || loading}
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-red-700"
              disabled={loading || isLocked}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Anmeldung läuft...
                </>
              ) : isLocked ? (
                `Gesperrt (${formatRemainingTime(remainingTime)})`
              ) : (
                "Anmelden"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
