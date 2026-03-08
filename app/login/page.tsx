"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, AlertCircle, Mail, Lock, ChevronDown, ChevronUp, Phone } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Rate limiting configuration
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;
const DELAY_BASE = 1000;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [showHelp, setShowHelp] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const attemptsRef = useRef<number>(0);
  const lockoutRef = useRef<number | null>(null);

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

  const formatRemainingTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (lockoutUntil && lockoutUntil > Date.now()) {
      toast.error("Account gesperrt", {
        description: `Bitte warten Sie ${formatRemainingTime(remainingTime)} Minuten.`,
      });
      return;
    }
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
    if (attemptsRef.current > 0) {
      const delay = DELAY_BASE * Math.pow(2, attemptsRef.current - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const newAttempts = attemptsRef.current + 1;
      attemptsRef.current = newAttempts;
      setAttempts(newAttempts);
      localStorage.setItem("login_attempts", newAttempts.toString());
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
      attemptsRef.current = 0;
      setAttempts(0);
      localStorage.removeItem("login_attempts");
      localStorage.removeItem("login_lockout_until");
      // Set welcome flag for dashboard
      localStorage.setItem("show_welcome", Date.now().toString());
      toast.success("Erfolgreich eingeloggt");
      router.push("/app");
      router.refresh();
    }
  }

  const isLocked = lockoutUntil !== null && lockoutUntil > Date.now();
  const remainingAttempts = MAX_ATTEMPTS - attempts;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-5">
        {/* Logo */}
        <img
          src="/LogoTEXTB.png"
          alt="Plesnicar Solutions"
          className="h-14 sm:h-16 object-contain"
        />

        {/* Single Card - Alles drin */}
        <div className="w-full rounded-xl border border-border/50 bg-card/95 backdrop-blur-sm shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="text-center px-6 pt-5 pb-2">
            <h1 className="text-lg sm:text-xl font-bold text-foreground">
              Willkommen zurück
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Melden Sie sich in Ihrem CRM-System an
            </p>
          </div>

          {/* Form */}
          <div className="px-6 pb-4 pt-2">
            {isLocked && (
              <Alert variant="destructive" className="mb-3 text-xs">
                <AlertCircle className="h-3.5 w-3.5" />
                <AlertDescription className="text-xs">
                  Account gesperrt – bitte {formatRemainingTime(remainingTime)} warten.
                </AlertDescription>
              </Alert>
            )}

            {!isLocked && attempts > 0 && (
              <Alert variant="default" className="mb-3 border-yellow-500/50 bg-yellow-500/10">
                <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />
                <AlertDescription className="text-xs text-yellow-600 dark:text-yellow-400">
                  {remainingAttempts > 0
                    ? `Noch ${remainingAttempts} Versuch${remainingAttempts > 1 ? "e" : ""} übrig`
                    : "Letzter Versuch!"}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs font-medium flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  E-Mail-Adresse
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ihre.email@beispiel.de"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-9 sm:h-10 bg-secondary/50 border-border/50 focus:border-primary/50 text-sm"
                  disabled={isLocked || loading}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-xs font-medium flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  Passwort
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Ihr Passwort"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-9 sm:h-10 bg-secondary/50 border-border/50 focus:border-primary/50 text-sm"
                  disabled={isLocked || loading}
                  autoComplete="current-password"
                />
                <a
                  href="tel:+436644678382"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-1 justify-end"
                >
                  <Phone className="h-3 w-3" />
                  Passwort vergessen?
                </a>
              </div>

              <Button
                type="submit"
                className="w-full h-9 sm:h-10 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg transition-all text-sm font-semibold"
                disabled={loading || isLocked}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Anmeldung...
                  </>
                ) : isLocked ? (
                  <>
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Gesperrt ({formatRemainingTime(remainingTime)})
                  </>
                ) : (
                  "Anmelden"
                )}
              </Button>
            </form>
          </div>

          {/* Hilfe-Bereich – Aufklappbar, integriert in die gleiche Card */}
          <div className="border-t border-border/30">
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="w-full flex items-center justify-center gap-1.5 px-6 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            >
              {showHelp ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              Hilfe beim Anmelden
            </button>

            {showHelp && (
              <div className="px-6 pb-4 text-xs text-muted-foreground space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <p>
                  <strong className="text-foreground">Lieber Papa,</strong> so geht's:
                </p>
                <ol className="list-decimal list-inside space-y-0.5 ml-1">
                  <li>E-Mail-Adresse oben eingeben</li>
                  <li>Passwort eingeben</li>
                  <li>Auf den roten <strong className="text-primary">"Anmelden"</strong> Button klicken</li>
                </ol>
                <div className="pt-1.5">
                  <a
                    href="tel:+436644678382"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Ruf Boris an, oder schreibe ihm für Hilfe
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
