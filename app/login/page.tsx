"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, AlertCircle, Mail, Lock, HelpCircle, Info } from "lucide-react";
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Logo & Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"></div>
              <img
                src="/LogoTEXTB.png"
                alt="Plesnicar Solutions"
                className="relative mx-auto h-20 object-contain drop-shadow-lg"
              />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Willkommen zurück
            </h1>
            <p className="text-muted-foreground text-base">
              Melden Sie sich in Ihrem CRM-System an
            </p>
          </div>
        </div>

        {/* Main Login Card */}
        <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-xl">
          <CardContent className="pt-6">
            {isLocked && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Ihr Account wurde aufgrund zu vieler fehlgeschlagener Versuche gesperrt.
                  Bitte versuchen Sie es in {formatRemainingTime(remainingTime)} erneut.
                </AlertDescription>
              </Alert>
            )}

            {!isLocked && attempts > 0 && (
              <Alert variant="default" className="mb-6 border-yellow-500/50 bg-yellow-500/10">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-600 dark:text-yellow-400">
                  {remainingAttempts > 0
                    ? `Noch ${remainingAttempts} Versuch${remainingAttempts > 1 ? "e" : ""} verbleibend.`
                    : "Letzter Versuch vor der Sperrung."}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  E-Mail-Adresse
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ihre.email@beispiel.de"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 bg-secondary/50 border-border/50 focus:border-primary/50 transition-colors"
                  disabled={isLocked || loading}
                  autoComplete="email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  Passwort
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Ihr Passwort"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 bg-secondary/50 border-border/50 focus:border-primary/50 transition-colors"
                  disabled={isLocked || loading}
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-200 text-base font-semibold"
                disabled={loading || isLocked}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Anmeldung läuft...
                  </>
                ) : isLocked ? (
                  <>
                    <AlertCircle className="mr-2 h-5 w-5" />
                    Gesperrt ({formatRemainingTime(remainingTime)})
                  </>
                ) : (
                  "Anmelden"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Help Card for Papa */}
        <Card className="border-primary/20 bg-primary/5 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="rounded-full bg-primary/20 p-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  Hilfe beim Anmelden
                </h3>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    <strong className="text-foreground">Lieber Papa,</strong> falls du Probleme beim Anmelden hast:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Gib deine E-Mail-Adresse ein (die, die du bei der Anmeldung verwendet hast)</li>
                    <li>Gib dein Passwort ein (das, das du beim Erstellen des Accounts festgelegt hast)</li>
                    <li>Klicke auf "Anmelden"</li>
                  </ul>
                  <p className="pt-2 text-xs text-muted-foreground/80">
                    Falls du dein Passwort vergessen hast, kontaktiere bitte Boris.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
