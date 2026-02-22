"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  Clock,
  LogOut,
  Menu,
  X,
  Wallet,
  Receipt,
  StickyNote,
  HelpCircle,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const navItems = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/clients", label: "Kunden", icon: Users },
  { href: "/app/projects", label: "Projekte", icon: FolderKanban },
  { href: "/app/offers", label: "Angebote", icon: FileText },
  { href: "/app/invoices", label: "Rechnungen", icon: Receipt },
  { href: "/app/time", label: "Zeiterfassung", icon: Clock },
  { href: "/app/transactions", label: "Einnahmen & Ausgaben", icon: Wallet },
  { href: "/app/employees", label: "Team", icon: UserCircle },
  { href: "/app/notes", label: "Notizen", icon: StickyNote },
  { href: "/app/help", label: "Hilfe & Anleitung", icon: HelpCircle },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Abgemeldet");
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col border-r border-border bg-sidebar">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <img
            src="/LogoTEXTB.png"
            alt="Plesnicar Solutions"
            className="h-8 object-contain"
          />
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Abmelden
          </button>
        </div>
      </aside>

      {/* Mobile Header + Overlay */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-14 items-center justify-between border-b border-border bg-sidebar px-4 md:hidden">
          <div className="flex items-center gap-2">
            <img
              src="/LogoTEXTB.png"
              alt="Plesnicar Solutions"
              className="h-7 object-contain"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </header>

        {/* Mobile Nav Overlay */}
        {mobileOpen && (
          <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden">
            <div className="absolute right-0 top-0 h-full w-64 border-l border-border bg-sidebar p-4">
              <div className="flex justify-end mb-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive(item.href)
                          ? "bg-primary/10 text-primary"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-4 border-t border-sidebar-border pt-4">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  Abmelden
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
