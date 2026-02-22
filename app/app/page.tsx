"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import {
  Users,
  FolderKanban,
  FileText,
  DollarSign,
  Clock,
  Plus,
  Timer,
  TrendingUp,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/calculations";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { de } from "date-fns/locale";

interface DashboardData {
  openLeads: number;
  activeProjects: number;
  offersSent: number;
  revenueMonth: number;
  hoursMonth: number;
  totalClients: number;
  totalProjects: number;
  totalOffers: number;
  revenueData: { month: string; revenue: number }[];
  projectStatusData: { name: string; value: number; color: string }[];
  recentOffers: Array<{
    id: string;
    offer_number: string;
    total: number;
    date: string;
    status: string;
    client_name: string;
  }>;
  recentProjects: Array<{
    id: string;
    title: string;
    status: string;
    client_name: string;
  }>;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    openLeads: 0,
    activeProjects: 0,
    offersSent: 0,
    revenueMonth: 0,
    hoursMonth: 0,
    totalClients: 0,
    totalProjects: 0,
    totalOffers: 0,
    revenueData: [],
    projectStatusData: [],
    recentOffers: [],
    recentProjects: [],
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadDashboard() {
      const now = new Date();
      const startOfMonthDate = startOfMonth(now);
      const endOfMonthDate = endOfMonth(now);
      const startOfMonthStr = startOfMonthDate.toISOString();
      const endOfMonthStr = endOfMonthDate.toISOString();

      // Get last 6 months for revenue chart (only real income from transactions)
      const revenueData = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const monthKey = format(monthDate, "MMM yyyy", { locale: de });

        const { data: incomes } = await supabase
          .from("transactions")
          .select("amount, type, date")
          .eq("type", "income")
          .gte("date", format(monthStart, "yyyy-MM-dd"))
          .lte("date", format(monthEnd, "yyyy-MM-dd"));

        const revenue = (incomes || []).reduce(
          (sum, t) => sum + (t.amount || 0),
          0
        );
        revenueData.push({ month: monthKey, revenue });
      }

      const [
        leads,
        projects,
        offers,
        incomes,
        timeEntries,
        allClients,
        allProjects,
        allOffers,
        projectStatuses,
        recentOffersRes,
        recentProjectsRes,
      ] = await Promise.all([
        supabase
          .from("clients")
          .select("id", { count: "exact", head: true })
          .eq("status", "lead"),
        supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("offers")
          .select("id", { count: "exact", head: true })
          .eq("status", "sent"),
        // Monthly income from transactions (real cash in)
        supabase
          .from("transactions")
          .select("amount, type, date")
          .eq("type", "income")
          .gte("date", format(startOfMonthDate, "yyyy-MM-dd"))
          .lte("date", format(endOfMonthDate, "yyyy-MM-dd")),
        supabase
          .from("time_entries")
          .select("duration_minutes")
          .gte("start_time", startOfMonthStr)
          .lte("start_time", endOfMonthStr),
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase.from("offers").select("id", { count: "exact", head: true }),
        supabase
          .from("projects")
          .select("status")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("offers")
          .select("*, clients(name)")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("projects")
          .select("*, clients(name)")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      // Revenue = sum of incomes (transactions) this month
      const revenueMonth = (incomes.data || []).reduce(
        (sum, t) => sum + (t.amount || 0),
        0
      );
      const hoursMonth =
        (timeEntries.data || []).reduce(
          (sum, t) => sum + (t.duration_minutes || 0),
          0
        ) / 60;

      // Project status distribution
      const statusCounts: Record<string, number> = {};
      (projectStatuses.data || []).forEach((p) => {
        statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
      });
      const projectStatusData = [
        {
          name: "Geplant",
          value: statusCounts.planned || 0,
          color: "#f59e0b",
        },
        {
          name: "Aktiv",
          value: statusCounts.active || 0,
          color: "#10b981",
        },
        {
          name: "Fertig",
          value: statusCounts.done || 0,
          color: "#3b82f6",
        },
      ].filter((d) => d.value > 0);

      const recentOffers = (recentOffersRes.data || []).map((o: any) => ({
        id: o.id,
        offer_number: o.offer_number,
        total: o.total,
        date: o.date,
        status: o.status,
        client_name: (o.clients as any)?.name || "–",
      }));

      const recentProjects = (recentProjectsRes.data || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        client_name: (p.clients as any)?.name || "–",
      }));

      setData({
        openLeads: leads.count || 0,
        activeProjects: projects.count || 0,
        offersSent: offers.count || 0,
        revenueMonth,
        hoursMonth,
        totalClients: allClients.count || 0,
        totalProjects: allProjects.count || 0,
        totalOffers: allOffers.count || 0,
        revenueData,
        projectStatusData,
        recentOffers,
        recentProjects,
      });
      setLoading(false);
    }
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpis = [
    {
      title: "Offene Leads",
      value: data.openLeads.toString(),
      icon: Users,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      change: "+12%",
    },
    {
      title: "Aktive Projekte",
      value: data.activeProjects.toString(),
      icon: FolderKanban,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      change: "+5",
    },
    {
      title: "Angebote gesendet",
      value: data.offersSent.toString(),
      icon: FileText,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
      change: "+3",
    },
    {
      title: "Einnahmen (Monat)",
      value: formatCurrency(data.revenueMonth),
      icon: DollarSign,
      color: "text-primary",
      bgColor: "bg-primary/10",
      change: "+8%",
    },
    {
      title: "Stunden (Monat)",
      value: `${data.hoursMonth.toFixed(1)}h`,
      icon: Clock,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      change: "+2.5h",
    },
  ];

  const statusColors: Record<string, string> = {
    draft: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    sent: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    accepted: "bg-green-500/10 text-green-400 border-green-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
    planned: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    active: "bg-green-500/10 text-green-400 border-green-500/20",
    done: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };

  const statusLabels: Record<string, string> = {
    draft: "Entwurf",
    sent: "Gesendet",
    accepted: "Angenommen",
    rejected: "Abgelehnt",
    planned: "Geplant",
    active: "Aktiv",
    done: "Fertig",
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Willkommen bei Plesnicar Solutions CRM
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push("/app/clients?new=1")}
            className="bg-primary text-primary-foreground hover:bg-red-700 text-sm sm:text-base"
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Neuer Kunde</span>
            <span className="sm:hidden">Neu</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.title}
              className="border-border bg-card hover:shadow-lg transition-shadow"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <div className={`p-1.5 sm:p-2 rounded-lg ${kpi.bgColor}`}>
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${kpi.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold text-foreground mb-1">
                  {loading ? "..." : kpi.value}
                </div>
                <div className="flex items-center gap-1 text-[10px] sm:text-xs text-green-400">
                  <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  <span>{kpi.change}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Revenue Chart */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Umsatzentwicklung (6 Monate)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[200px] sm:h-[300px] flex items-center justify-center">
                <div className="text-muted-foreground text-sm">Lädt...</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200} className="sm:h-[300px]">
                <LineChart data={data.revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="month"
                    stroke="#888"
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis
                    stroke="#888"
                    style={{ fontSize: "12px" }}
                    tickFormatter={(value) => `${value}€`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#222",
                      border: "1px solid #333",
                      borderRadius: "6px",
                    }}
                    formatter={(value: number | undefined) => [
                      value ? formatCurrency(value) : "0,00 €",
                      "Umsatz",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#dc2626"
                    strokeWidth={2}
                    dot={{ fill: "#dc2626", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Project Status Pie Chart */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-green-400" />
              Projekt-Status Verteilung
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-muted-foreground">Lädt...</div>
              </div>
            ) : data.projectStatusData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-muted-foreground">Keine Daten</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200} className="sm:h-[300px]">
                <PieChart>
                  <Pie
                    data={data.projectStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.projectStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#222",
                      border: "1px solid #333",
                      borderRadius: "6px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats & Recent Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total Stats */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-400" />
              Gesamtstatistiken
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Kunden</span>
              <span className="text-lg font-semibold">{data.totalClients}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Projekte</span>
              <span className="text-lg font-semibold">{data.totalProjects}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Angebote</span>
              <span className="text-lg font-semibold">{data.totalOffers}</span>
            </div>
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Gesamteinnahmen
                </span>
                <span className="text-lg font-bold text-primary">
                  {loading
                    ? "..."
                    : formatCurrency(
                        data.revenueData.reduce(
                          (sum, d) => sum + d.revenue,
                          0
                        )
                      )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Offers */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-yellow-400" />
              Letzte Angebote
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/app/offers")}
            >
              Alle anzeigen
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-muted-foreground text-sm">Lädt...</div>
            ) : data.recentOffers.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                Keine Angebote vorhanden
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/app/offers/${offer.id}`)}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{offer.offer_number}</div>
                      <div className="text-xs text-muted-foreground">
                        {offer.client_name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {formatCurrency(offer.total)}
                      </span>
                      <Badge
                        variant="outline"
                        className={statusColors[offer.status]}
                      >
                        {statusLabels[offer.status]}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Projects */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-green-400" />
              Letzte Projekte
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/app/projects")}
            >
              Alle anzeigen
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-muted-foreground text-sm">Lädt...</div>
            ) : data.recentProjects.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                Keine Projekte vorhanden
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/app/projects/${project.id}`)}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{project.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {project.client_name}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={statusColors[project.status]}
                    >
                      {statusLabels[project.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg sm:text-xl">Schnellaktionen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Button
              onClick={() => router.push("/app/clients?new=1")}
              className="bg-primary text-primary-foreground hover:bg-red-700 text-sm"
              size="sm"
            >
              <Plus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Neuer Kunde</span>
              <span className="sm:hidden">Kunde</span>
            </Button>
            <Button
              onClick={() => router.push("/app/offers/new")}
              variant="outline"
              className="border-border text-sm"
              size="sm"
            >
              <FileText className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Angebot</span>
              <span className="sm:hidden">Angebot</span>
            </Button>
            <Button
              onClick={() => router.push("/app/time")}
              variant="outline"
              className="border-border text-sm"
              size="sm"
            >
              <Timer className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Timer</span>
              <span className="sm:hidden">Timer</span>
            </Button>
            <Button
              onClick={() => router.push("/app/projects")}
              variant="outline"
              className="border-border text-sm"
              size="sm"
            >
              <FolderKanban className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Projekt</span>
              <span className="sm:hidden">Projekt</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
