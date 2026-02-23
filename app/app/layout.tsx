"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
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
  Calendar,
  ChevronDown,
  ChevronRight,
  Briefcase,
  DollarSign,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import AIChatbot from "@/components/ai-chatbot";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavCategory = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  defaultOpen?: boolean;
};

const navCategories: NavCategory[] = [
  {
    label: "Übersicht",
    icon: LayoutDashboard,
    items: [{ href: "/app", label: "Dashboard", icon: LayoutDashboard }],
    defaultOpen: true,
  },
  {
    label: "Kunden & Projekte",
    icon: Briefcase,
    items: [
      { href: "/app/clients", label: "Kunden", icon: Users },
      { href: "/app/projects", label: "Projekte", icon: FolderKanban },
    ],
    defaultOpen: true,
  },
  {
    label: "Finanzen",
    icon: DollarSign,
    items: [
      { href: "/app/offers", label: "Angebote", icon: FileText },
      { href: "/app/invoices", label: "Rechnungen", icon: Receipt },
      { href: "/app/transactions", label: "Einnahmen & Ausgaben", icon: Wallet },
    ],
  },
  {
    label: "Zeit & Planung",
    icon: CalendarDays,
    items: [
      { href: "/app/time", label: "Zeiterfassung", icon: Clock },
      { href: "/app/events", label: "Kalender", icon: Calendar },
    ],
  },
  {
    label: "Team",
    icon: UserCircle,
    items: [{ href: "/app/employees", label: "Team", icon: UserCircle }],
  },
  {
    label: "Sonstiges",
    icon: StickyNote,
    items: [{ href: "/app/notes", label: "Notizen", icon: StickyNote }],
  },
  {
    label: "Hilfe",
    icon: HelpCircle,
    items: [{ href: "/app/help", label: "Hilfe & Anleitung", icon: HelpCircle }],
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    new Set(navCategories.filter((cat) => cat.defaultOpen).map((cat) => cat.label))
  );

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

  function toggleCategory(categoryLabel: string) {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryLabel)) {
        next.delete(categoryLabel);
      } else {
        next.add(categoryLabel);
      }
      return next;
    });
  }

  function isCategoryOpen(categoryLabel: string) {
    return openCategories.has(categoryLabel);
  }

  function hasActiveItem(items: NavItem[]) {
    return items.some((item) => isActive(item.href));
  }

  // Auto-expand categories with active items
  useEffect(() => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      navCategories.forEach((category) => {
        const hasActive = category.items.some((item) => {
          if (item.href === "/app") return pathname === "/app";
          return pathname.startsWith(item.href);
        });
        if (hasActive) {
          next.add(category.label);
        }
      });
      return next;
    });
  }, [pathname]);

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
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navCategories.map((category) => {
            const CategoryIcon = category.icon;
            const isOpen = isCategoryOpen(category.label);
            const hasActive = hasActiveItem(category.items);

            return (
              <div key={category.label} className="space-y-1">
                {category.items.length > 1 ? (
                  <>
                    <button
                      onClick={() => toggleCategory(category.label)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        hasActive
                          ? "bg-primary/10 text-primary"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <CategoryIcon className="h-5 w-5" />
                        <span>{category.label}</span>
                      </div>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="ml-4 space-y-1 border-l border-sidebar-border pl-3">
                        {category.items.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                isActive(item.href)
                                  ? "bg-primary/10 text-primary"
                                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                              )}
                            >
                              <Icon className="h-4 w-4" />
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={category.items[0].href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive(category.items[0].href)
                        ? "bg-primary/10 text-primary"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <CategoryIcon className="h-5 w-5" />
                    {category.items[0].label}
                  </Link>
                )}
              </div>
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
              <nav className="space-y-1 overflow-y-auto">
                {navCategories.map((category) => {
                  const CategoryIcon = category.icon;
                  const isOpen = isCategoryOpen(category.label);
                  const hasActive = hasActiveItem(category.items);

                  return (
                    <div key={category.label} className="space-y-1">
                      {category.items.length > 1 ? (
                        <>
                          <button
                            onClick={() => toggleCategory(category.label)}
                            className={cn(
                              "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                              hasActive
                                ? "bg-primary/10 text-primary"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <CategoryIcon className="h-5 w-5" />
                              <span>{category.label}</span>
                            </div>
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                          {isOpen && (
                            <div className="ml-4 space-y-1 border-l border-sidebar-border pl-3">
                              {category.items.map((item) => {
                                const Icon = item.icon;
                                return (
                                  <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={cn(
                                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                      isActive(item.href)
                                        ? "bg-primary/10 text-primary"
                                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                                    )}
                                  >
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </>
                      ) : (
                        <Link
                          href={category.items[0].href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                            isActive(category.items[0].href)
                              ? "bg-primary/10 text-primary"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          )}
                        >
                          <CategoryIcon className="h-5 w-5" />
                          {category.items[0].label}
                        </Link>
                      )}
                    </div>
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

      {/* AI Chatbot */}
      <AIChatbot />
    </div>
  );
}
