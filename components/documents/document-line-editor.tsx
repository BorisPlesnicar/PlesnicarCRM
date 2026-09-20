"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/calculations";
import {
  type BauFormRow,
  bauLineTotal,
  defaultBauPositionRow,
  defaultTextBlockRow,
  nextRowId,
} from "@/lib/bau-invoice-rows";
import { AlignLeft, Calculator, Plus, Trash2 } from "lucide-react";

/** Kommazahl aus Eingabe ("22,38" und "22.38"). */
export function parseDecimalInput(value: string, fallback: number): number {
  if (value === "" || value == null) return fallback;
  const n = parseFloat(String(value).trim().replace(",", "."));
  return Number.isNaN(n) ? fallback : n;
}

interface IntroTextCardProps {
  value: string;
  onChange: (value: string) => void;
  title?: string;
  hint?: string;
  placeholder?: string;
}

/** Einleitungstext oberhalb der Positionstabelle (Rechnung: intro_text, Angebot: project_scope_short). */
export function IntroTextCard({
  value,
  onChange,
  title = "Text oberhalb der Leistungen",
  hint = "Optionaler Einleitungstext, der über der Positionstabelle in der PDF erscheint.",
  placeholder = "z.B. Leistungen gemäß Auftrag vom … / Beschreibung des Vorhabens …",
}: IntroTextCardProps) {
  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur-xl rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-muted-foreground font-normal">{hint}</p>
      </CardHeader>
      <CardContent>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="flex min-h-[80px] w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-sm backdrop-blur-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </CardContent>
    </Card>
  );
}

interface DocumentLineEditorProps {
  rows: BauFormRow[];
  onRowsChange: (rows: BauFormRow[]) => void;
  /** Einheit für neue Positionen (Rechnung/BAU: "Stk", IT-Angebot: "Std."). */
  defaultUnit?: string;
  title?: string;
  hint?: string;
}

/**
 * Ein Positions-Editor für Rechnungen und Angebote (IT + BAU):
 * Positionen mit Anzahl/Einheit/Einheitspreis/Rabatt plus freie Abschnittstexte.
 */
export function DocumentLineEditor({
  rows,
  onRowsChange,
  defaultUnit = "Stk",
  title = "Leistungen",
  hint = "Zwischen Positionen „Abschnittstext“ einfügen – gleiche Darstellung wie der Text oberhalb der Tabelle in der PDF.",
}: DocumentLineEditorProps) {
  function insertAt(index: number, row: BauFormRow) {
    onRowsChange([...rows.slice(0, index), row, ...rows.slice(index)]);
  }

  function updatePosition(
    id: string,
    field: "description" | "quantity" | "unit" | "price" | "discount_percent",
    value: string | number
  ) {
    onRowsChange(
      rows.map((row) =>
        row.id === id && row.kind === "position" ? { ...row, [field]: value } : row
      )
    );
  }

  function updateText(id: string, text: string) {
    onRowsChange(
      rows.map((row) => (row.id === id && row.kind === "text_block" ? { ...row, text } : row))
    );
  }

  function remove(id: string) {
    const next = rows.filter((row) => row.id !== id);
    onRowsChange(next.length > 0 ? next : [defaultBauPositionRow(nextRowId(), defaultUnit)]);
  }

  const netSum = rows.reduce(
    (sum, row) =>
      row.kind === "position"
        ? sum + bauLineTotal(row.quantity || 0, row.price || 0, row.discount_percent ?? 0)
        : sum,
    0
  );

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur-xl rounded-2xl">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {title}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1 font-normal leading-snug">{hint}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => insertAt(rows.length, defaultBauPositionRow(nextRowId(), defaultUnit))}
            className="bg-primary text-primary-foreground hover:bg-red-700 rounded-xl"
          >
            <Plus className="mr-2 h-4 w-4" />
            Position
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl"
            onClick={() => insertAt(rows.length, defaultTextBlockRow(nextRowId()))}
          >
            <AlignLeft className="mr-2 h-4 w-4" />
            Abschnittstext
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rows.map((row, idx) => {
            const rowActions = (
              <div className="flex flex-col gap-1 flex-shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => insertAt(idx, defaultBauPositionRow(nextRowId(), defaultUnit))}
                  title="Position darüber einfügen"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => insertAt(idx, defaultTextBlockRow(nextRowId()))}
                  title="Abschnittstext darüber einfügen"
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => remove(row.id)}
                  className="text-destructive hover:text-destructive"
                  disabled={rows.length === 1}
                  title="Zeile entfernen"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );

            if (row.kind === "text_block") {
              return (
                <div
                  key={row.id}
                  className="flex gap-3 items-start p-3 rounded-2xl border border-orange-500/25 bg-orange-500/5 backdrop-blur-sm"
                >
                  <div className="flex-shrink-0 pt-2 w-8 flex justify-center">
                    <AlignLeft className="h-4 w-4 text-orange-400/80 shrink-0" />
                  </div>
                  <div className="flex-1 space-y-2 min-w-0">
                    <Label className="text-xs text-muted-foreground">Abschnittstext (PDF)</Label>
                    <textarea
                      value={row.text}
                      onChange={(e) => updateText(row.id, e.target.value)}
                      placeholder="z. B. Zweiter Auftrag – Dachgeschoss …"
                      rows={3}
                      className="flex w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-sm backdrop-blur-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                  {rowActions}
                </div>
              );
            }

            const ordinal = rows.slice(0, idx).filter((r) => r.kind === "position").length + 1;
            return (
              <div
                key={row.id}
                className="flex gap-3 items-start p-3 rounded-2xl border border-border/60 bg-secondary/40 backdrop-blur-sm"
              >
                <div className="flex-shrink-0 pt-2 text-sm text-muted-foreground w-8">
                  {ordinal}.
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  <Input
                    placeholder="Leistungsbeschreibung..."
                    value={row.description}
                    onChange={(e) => updatePosition(row.id, "description", e.target.value)}
                    className="bg-background/60 rounded-xl"
                  />
                  <div className="flex gap-2 items-center flex-wrap">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Anzahl"
                      value={row.quantity || ""}
                      onChange={(e) =>
                        updatePosition(row.id, "quantity", parseDecimalInput(e.target.value, 1))
                      }
                      className="bg-background/60 rounded-xl w-24"
                    />
                    <Input
                      placeholder="Einheit"
                      value={row.unit}
                      onChange={(e) => updatePosition(row.id, "unit", e.target.value)}
                      className="bg-background/60 rounded-xl w-24"
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Preis (€)"
                      value={row.price || ""}
                      onChange={(e) =>
                        updatePosition(row.id, "price", parseDecimalInput(e.target.value, 0))
                      }
                      className="bg-background/60 rounded-xl w-32"
                    />
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      placeholder="Rabatt %"
                      title="Rabatt in Prozent (optional)"
                      value={row.discount_percent || ""}
                      onChange={(e) =>
                        updatePosition(
                          row.id,
                          "discount_percent",
                          parseDecimalInput(e.target.value, 0)
                        )
                      }
                      className="bg-background/60 rounded-xl w-24"
                    />
                    <span className="text-sm text-muted-foreground tabular-nums">
                      ={" "}
                      {formatCurrency(
                        bauLineTotal(row.quantity || 0, row.price || 0, row.discount_percent ?? 0)
                      )}
                    </span>
                  </div>
                </div>
                {rowActions}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-end gap-3 border-t border-border/60 pt-3 text-sm">
          <span className="text-muted-foreground">Summe Positionen</span>
          <span className="font-medium tabular-nums">{formatCurrency(netSum)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
