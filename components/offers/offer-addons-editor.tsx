"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/calculations";
import { parseDecimalInput } from "@/components/documents/document-line-editor";
import { Plus, Trash2 } from "lucide-react";

export interface AddonFormRow {
  id: string;
  title: string;
  description: string;
  price: number;
}

interface Props {
  addons: AddonFormRow[];
  onChange: (addons: AddonFormRow[]) => void;
}

/** Zusatzpositionen mit Beschreibung – erscheinen als eigene Zeilen im Angebot. */
export function OfferAddonsEditor({ addons, onChange }: Props) {
  const sum = addons.reduce((s, a) => s + (Number(a.price) || 0), 0);

  function update(id: string, field: "title" | "description" | "price", value: string | number) {
    onChange(addons.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  }

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur-xl rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>Weitere Positionen</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-xl"
            onClick={() =>
              onChange([
                ...addons,
                { id: `addon-${Date.now()}-${addons.length}`, title: "", description: "", price: 0 },
              ])
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Position hinzufügen
          </Button>
        </CardTitle>
        <p className="text-sm text-muted-foreground font-normal">
          Zusatzpositionen mit Beschreibung, z. B. Marketing Plan – erscheinen in der Tabelle
          „Leistungen“ und in der Summe.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {addons.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Keine weiteren Positionen vorhanden.
            </p>
          ) : (
            addons.map((addon) => (
              <div
                key={addon.id}
                className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-secondary/40 p-3 backdrop-blur-sm sm:flex-row sm:items-start"
              >
                <div className="flex-1 grid gap-2 sm:grid-cols-2 min-w-0">
                  <Input
                    placeholder="Titel (z. B. Marketing Plan)"
                    value={addon.title}
                    onChange={(e) => update(addon.id, "title", e.target.value)}
                    className="bg-background/60 rounded-xl"
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Preis (€)"
                    value={addon.price ? addon.price : ""}
                    onChange={(e) =>
                      update(addon.id, "price", parseDecimalInput(e.target.value, 0))
                    }
                    className="bg-background/60 rounded-xl sm:max-w-[10rem]"
                  />
                </div>
                <Textarea
                  placeholder="Beschreibung (optional)"
                  value={addon.description}
                  onChange={(e) => update(addon.id, "description", e.target.value)}
                  className="min-h-[60px] resize-none bg-background/60 rounded-xl flex-1"
                  rows={2}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => onChange(addons.filter((a) => a.id !== addon.id))}
                  className="flex-shrink-0 text-destructive hover:text-destructive self-end sm:self-start"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
        {sum > 0 && (
          <div className="mt-4 flex items-center justify-end gap-3 border-t border-border/60 pt-3 text-sm">
            <span className="text-muted-foreground">Summe weitere Positionen</span>
            <span className="font-medium tabular-nums">{formatCurrency(sum)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
