"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/app/app/AuthProvider";
import { Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Edit, Trash2, TrendingUp, TrendingDown, Loader2, FileText } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { de } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const CREDIT_CATEGORY = "Kundenguthaben (ohne Bank)";

const INCOME_CATEGORIES = [
  "Rechnung",
  "Teilanzahlung",
  "Restzahlung",
  CREDIT_CATEGORY,
  "Sonstige Einnahme",
  "Rückzahlung",
];

const EXPENSE_CATEGORIES = [
  "Material",
  "Dienstleistung",
  "Büro",
  "Marketing",
  "Steuern",
  "Versicherung",
  CREDIT_CATEGORY,
  "Sonstige Ausgabe",
];

const SALDO_INCLUDE_CRM_CREDIT_KEY = "plesnicar_tx_saldo_include_crm_credit";

function isBankRelevant(t: Pick<Transaction, "affects_bank_balance">): boolean {
  return t.affects_bank_balance !== false;
}

interface ExtendedTransaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string | null;
  date: string;
  notes: string | null;
  affects_bank_balance?: boolean;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterBank, setFilterBank] = useState<"all" | "bank" | "nonbank">("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const supabase = createClient();
  const { canWrite } = useAuth();

  // Form state
  const [type, setType] = useState<"income" | "expense">("income");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [affectsBankBalance, setAffectsBankBalance] = useState(true);
  const [crmCreditTotal, setCrmCreditTotal] = useState<number | null>(null);
  const [saldoIncludeCrmCredit, setSaldoIncludeCrmCredit] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        setSaldoIncludeCrmCredit(localStorage.getItem(SALDO_INCLUDE_CRM_CREDIT_KEY) === "1");
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [filterMonth]);

  function persistSaldoIncludeCrmCredit(next: boolean) {
    setSaldoIncludeCrmCredit(next);
    try {
      localStorage.setItem(SALDO_INCLUDE_CRM_CREDIT_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  async function loadCrmCreditStand() {
    const { data, error } = await supabase.from("clients").select("credit_balance, client_type");
    if (error || !data) {
      setCrmCreditTotal(null);
      return;
    }
    const sum = data
      .filter((c) => (c.client_type as string) === "bau")
      .reduce((s, c) => s + Math.max(0, Number(c.credit_balance ?? 0)), 0);
    setCrmCreditTotal(sum);
  }

  async function loadTransactions() {
    setLoading(true);

    let query = supabase.from("transactions").select("*").order("date", { ascending: false });

    if (filterMonth !== "all") {
      const [year, month] = filterMonth.split("-");
      const start = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
      const end = endOfMonth(new Date(parseInt(year), parseInt(month) - 1));
      query = query.gte("date", format(start, "yyyy-MM-dd")).lte("date", format(end, "yyyy-MM-dd"));
    }

    const { data: transactionsData, error: transactionsError } = await query;

    if (transactionsError) {
      toast.error("Fehler beim Laden", { description: transactionsError.message });
    } else {
      setTransactions(transactionsData || []);
    }

    await loadCrmCreditStand();
    setLoading(false);
  }

  function resetForm() {
    setType("income");
    setAmount("");
    setDescription("");
    setCategory("");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setNotes("");
    setEditingId(null);
    setAffectsBankBalance(true);
  }

  async function handleSave() {
    if (!canWrite) return;
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Bitte geben Sie einen Betrag ein");
      return;
    }
    if (!description.trim()) {
      toast.error("Bitte geben Sie eine Beschreibung ein");
      return;
    }

    const transactionData = {
      type,
      amount: parseFloat(amount),
      description: description.trim(),
      category: category || null,
      date,
      notes: notes.trim() || null,
      affects_bank_balance: affectsBankBalance,
    };

    if (editingId) {
      const { error } = await supabase
        .from("transactions")
        .update(transactionData)
        .eq("id", editingId);
      if (error) {
        toast.error("Fehler beim Speichern", { description: error.message });
      } else {
        toast.success("Transaktion aktualisiert");
        setDialogOpen(false);
        resetForm();
        loadTransactions();
      }
    } else {
      const { error } = await supabase.from("transactions").insert(transactionData);
      if (error) {
        toast.error("Fehler beim Speichern", { description: error.message });
      } else {
        toast.success("Transaktion erstellt");
        setDialogOpen(false);
        resetForm();
        loadTransactions();
      }
    }
  }

  async function handleDelete(id: string) {
    if (!canWrite) return;
    if (!confirm("Möchten Sie diese Transaktion wirklich löschen?")) return;

    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) {
      toast.error("Fehler beim Löschen", { description: error.message });
    } else {
      toast.success("Transaktion gelöscht");
      loadTransactions();
    }
  }

  function handleEdit(transaction: Transaction | ExtendedTransaction) {
    const manualTransaction = transactions.find((t) => t.id === transaction.id);
    if (!manualTransaction) return;
    
    setEditingId(manualTransaction.id);
    setType(manualTransaction.type);
    setAmount(manualTransaction.amount.toString());
    setDescription(manualTransaction.description);
    setCategory(manualTransaction.category || "");
    setDate(manualTransaction.date);
    setNotes(manualTransaction.notes || "");
    setAffectsBankBalance(isBankRelevant(manualTransaction));
    setDialogOpen(true);
  }

  // Alle Transaktionen (manuell gepflegt)
  const allTransactions = useMemo((): ExtendedTransaction[] => {
    const manualTransactions: ExtendedTransaction[] = transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      description: t.description,
      category: t.category,
      date: t.date,
      notes: t.notes,
      affects_bank_balance: t.affects_bank_balance,
    }));

    // Nach Datum sortieren (neueste zuerst)
    const combined = [...manualTransactions].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return combined;
  }, [transactions]);

  const scopedForStats = useMemo(() => {
    let list = allTransactions;
    if (filterType !== "all") {
      list = list.filter((t) => t.type === filterType);
    }
    return list;
  }, [allTransactions, filterType]);

  const filteredTransactions = useMemo(() => {
    let filtered = allTransactions;
    if (filterType !== "all") {
      filtered = filtered.filter((t) => t.type === filterType);
    }
    if (filterBank === "bank") {
      filtered = filtered.filter((t) => isBankRelevant(t));
    } else if (filterBank === "nonbank") {
      filtered = filtered.filter((t) => !isBankRelevant(t));
    }
    return filtered;
  }, [allTransactions, filterType, filterBank]);

  const summarize = (list: ExtendedTransaction[]) => {
    const income = list.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const expenses = list.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    return { income, expenses, net: income - expenses };
  };

  const statsBank = useMemo(
    () => summarize(scopedForStats.filter((t) => isBankRelevant(t))),
    [scopedForStats]
  );

  const saldoDisplayValue = useMemo(() => {
    if (!saldoIncludeCrmCredit) return statsBank.net;
    const crm = crmCreditTotal ?? 0;
    return statsBank.net + crm;
  }, [statsBank.net, saldoIncludeCrmCredit, crmCreditTotal]);

  const saldoDisplayLoading = saldoIncludeCrmCredit && loading && crmCreditTotal === null;

  // Chart data (letzte 6 Monate) – nur manuelle Transaktionen
  const chartData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthKey = format(monthDate, "MMM yyyy", { locale: de });

      const monthTransactions = transactions.filter(
        (t) =>
          t.date >= format(monthStart, "yyyy-MM-dd") &&
          t.date <= format(monthEnd, "yyyy-MM-dd")
      );

      const monthBank = monthTransactions.filter((t) => isBankRelevant(t));

      const monthIncome = monthBank
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

      const monthExpenses = monthBank
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      months.push({
        month: monthKey,
        Einnahmen: monthIncome,
        Ausgaben: monthExpenses,
        Saldo: monthIncome - monthExpenses,
      });
    }
    return months;
  }, [transactions]);

  // Generate month options
  const monthOptions = useMemo(() => {
    const options = [{ value: "all", label: "Alle Monate" }];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const monthDate = subMonths(now, i);
      const value = format(monthDate, "yyyy-MM");
      const label = format(monthDate, "MMMM yyyy", { locale: de });
      options.push({ value, label });
    }
    return options;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Einnahmen & Ausgaben</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Finanzen</p>
          <p className="text-sm text-muted-foreground max-w-xl">
            Einnahmen und Ausgaben: Bank-Buchungen. Beim Saldo können Sie optional das Kundenguthaben aus den CRM-Profilen
            (Bau-Kunden) dazurechnen — rein zur Orientierung, nicht Ihr Kontostand.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          if (!canWrite) return;
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button
              className="shrink-0 bg-primary text-primary-foreground hover:bg-red-700"
              disabled={!canWrite}
            >
              <Plus className="mr-2 h-4 w-4" />
              Neue Transaktion
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Transaktion bearbeiten" : "Neue Transaktion"}
              </DialogTitle>
              <DialogDescription>
                Erfassen Sie eine Einnahme oder Ausgabe
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select value={type} onValueChange={(v) => setType(v as "income" | "expense")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Einnahme</SelectItem>
                    <SelectItem value="expense">Ausgabe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Betrag (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="z.B. Rechnung #123"
                />
              </div>
              <div className="space-y-2">
                <Label>Kategorie (optional)</Label>
                <Select
                  value={category}
                  onValueChange={(v) => {
                    setCategory(v);
                    if (v === CREDIT_CATEGORY) setAffectsBankBalance(false);
                    else setAffectsBankBalance(true);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kategorie wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {(type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-row items-center justify-between gap-4 rounded-xl border border-border/50 bg-muted/15 px-3 py-3">
                <div className="space-y-0.5 min-w-0">
                  <Label htmlFor="tx-bank-switch" className="text-foreground">
                    In Bank-Saldo einrechnen
                  </Label>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Aus = Guthaben / Verrechnung ohne echte Bankbewegung
                  </p>
                </div>
                <Switch
                  id="tx-bank-switch"
                  checked={affectsBankBalance}
                  onCheckedChange={setAffectsBankBalance}
                />
              </div>
              <div className="space-y-2">
                <Label>Datum</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Notizen (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Zusätzliche Informationen..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSave} className="bg-primary text-primary-foreground">
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Übersicht Einnahmen & Ausgaben</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Nur Bank-Buchungen — gleicher Zeitraum und Typ-Filter wie die Tabelle.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-border/50 bg-muted/10 px-3.5 py-3 backdrop-blur-md sm:flex-row sm:items-center sm:gap-3 sm:py-2.5">
            <Label htmlFor="saldo-include-crm" className="text-sm font-medium text-foreground cursor-pointer shrink-0">
              Kundenguthaben im Saldo
            </Label>
            <Switch
              id="saldo-include-crm"
              checked={saldoIncludeCrmCredit}
              onCheckedChange={persistSaldoIncludeCrmCredit}
              className="shrink-0"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="border-border/60 bg-card/80 backdrop-blur-md shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Einnahmen</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-400/90" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400 tabular-nums tracking-tight">
                {formatCurrency(statsBank.income)}
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/80 backdrop-blur-md shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ausgaben</CardTitle>
              <TrendingDown className="h-5 w-5 text-red-400/90" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400 tabular-nums tracking-tight">
                {formatCurrency(statsBank.expenses)}
              </div>
            </CardContent>
          </Card>
          <Card
            className={
              saldoIncludeCrmCredit
                ? "border-amber-500/30 bg-amber-500/[0.07] backdrop-blur-md shadow-none"
                : "border-primary/30 bg-primary/[0.07] backdrop-blur-md shadow-none"
            }
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-foreground">
                Saldo{saldoIncludeCrmCredit ? " · inkl. CRM" : ""}
              </CardTitle>
              <div className={`h-5 w-5 ${saldoDisplayValue >= 0 ? "text-green-400" : "text-red-400"}`}>
                {saldoDisplayValue >= 0 ? <TrendingUp /> : <TrendingDown />}
              </div>
            </CardHeader>
            <CardContent>
              {saldoDisplayLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground py-1">
                  <Loader2 className="h-6 w-6 animate-spin shrink-0 opacity-70" />
                </div>
              ) : (
                <div
                  className={`text-2xl font-bold tabular-nums tracking-tight ${saldoDisplayValue >= 0 ? "text-green-400" : "text-red-400"}`}
                >
                  {formatCurrency(saldoDisplayValue)}
                </div>
              )}
              {saldoIncludeCrmCredit && !saldoDisplayLoading && crmCreditTotal !== null && (
                <p className="text-[11px] text-muted-foreground mt-2 leading-snug tabular-nums">
                  Bank {formatCurrency(statsBank.net)} + Guthaben {formatCurrency(crmCreditTotal)}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
                {saldoIncludeCrmCredit
                  ? "Orientierung nur — CRM-Guthaben liegt nicht auf dem Konto."
                  : "Entspricht nicht automatisch dem Kontostand."}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Chart */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Entwicklung Bank-Saldo (6 Monate)</CardTitle>
          <p className="text-sm text-muted-foreground font-normal">Nur Transaktionen mit Bankabgleich</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="month" stroke="#888" style={{ fontSize: "12px" }} />
              <YAxis stroke="#888" style={{ fontSize: "12px" }} tickFormatter={(value) => `${value}€`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#222",
                  border: "1px solid #333",
                  borderRadius: "6px",
                }}
                formatter={(value: number | undefined) => [
                  value ? formatCurrency(value) : "0,00 €",
                  "",
                ]}
              />
              <Legend />
              <Line type="monotone" dataKey="Einnahmen" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="Ausgaben" stroke="#ef4444" strokeWidth={2} />
              <Line type="monotone" dataKey="Saldo" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="income">Einnahmen</SelectItem>
            <SelectItem value="expense">Ausgaben</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterBank} onValueChange={(v) => setFilterBank(v as typeof filterBank)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Buchungen</SelectItem>
            <SelectItem value="bank">Nur Bank</SelectItem>
            <SelectItem value="nonbank">Nur Guthaben</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transactions Table */}
      <Card className="border-border bg-card overflow-hidden">
        <CardHeader>
          <CardTitle>Transaktionen</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              Keine Transaktionen gefunden
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Datum</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Beschreibung</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead className="text-right">Betrag</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id} className="border-border">
                    <TableCell>{format(new Date(transaction.date), "dd.MM.yyyy", { locale: de })}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            transaction.type === "income"
                              ? "bg-green-500/10 text-green-400 border-green-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }
                        >
                          {transaction.type === "income" ? "Einnahme" : "Ausgabe"}
                        </Badge>
                        {transaction.category === "Rechnung" && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                            <FileText className="h-3 w-3 mr-1" />
                            Rechnung
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {transaction.description}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {transaction.category || "–"}
                    </TableCell>
                    <TableCell>
                      {isBankRelevant(transaction) ? (
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                          Bank
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400">
                          Guthaben
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${transaction.type === "income" ? "text-green-400" : "text-red-400"}`}>
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {canWrite ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(transaction)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(transaction.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Nur Lesen</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
