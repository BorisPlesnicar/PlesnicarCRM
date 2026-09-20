"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/calculations";
import { PACKAGE_PRESETS } from "@/lib/types";
import { parseDecimalInput } from "@/components/documents/document-line-editor";
import { Clock, Rocket, Server, Wrench } from "lucide-react";

export interface ItModuleState {
  packagePreset: string;
  expressEnabled: boolean;
  expressSurcharge: number;
  hostingEnabled: boolean;
  hostingFee: number;
  maintenanceEnabled: boolean;
  maintenanceMonths: number;
  maintenanceMonthly: number;
}

export interface ItModuleAmounts {
  expressEur: number;
  hostingEur: number;
  maintenanceEur: number;
}

interface Props {
  state: ItModuleState;
  amounts: ItModuleAmounts;
  onChange: (patch: Partial<ItModuleState>) => void;
  onApplyPreset: (presetKey: string) => void;
}

function ModuleTile({
  icon,
  title,
  hint,
  enabled,
  onToggle,
  amount,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  amount: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-4 backdrop-blur-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 rounded-xl border border-border/60 bg-muted/30 p-2 text-muted-foreground">
            {icon}
          </div>
          <div className="min-w-0">
            <Label className="text-base">{title}</Label>
            <p className="text-sm text-muted-foreground leading-snug">{hint}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Switch checked={enabled} onCheckedChange={onToggle} />
          {enabled && amount > 0 && (
            <span className="text-sm font-medium tabular-nums">+{formatCurrency(amount)}</span>
          )}
        </div>
      </div>
      {enabled && children && <div className="mt-4 pl-0 sm:pl-12">{children}</div>}
    </div>
  );
}

/** IT-spezifische Angebots-Module: Paket-Vorgabe, Express, Hosting, Wartung. */
export function OfferItModules({ state, amounts, onChange, onApplyPreset }: Props) {
  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur-xl rounded-2xl">
      <CardHeader>
        <CardTitle>IT-Module</CardTitle>
        <p className="text-sm text-muted-foreground font-normal">
          Nur für IT-Angebote: Paket-Vorgabe für die Positionen sowie Zuschläge und Leistungen, die
          als eigene Zeilen im Angebot erscheinen.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-border/60 bg-background/40 p-4 backdrop-blur-md">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl border border-border/60 bg-muted/30 p-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <Label className="text-base">Paket-Vorgabe</Label>
                <p className="text-sm text-muted-foreground leading-snug">
                  Belegt die Positionen mit Standard-Leistungen und Stunden vor. Danach frei
                  editierbar und erweiterbar.
                </p>
              </div>
              <Select
                value={state.packagePreset || "none"}
                onValueChange={(v) => {
                  const key = v === "none" ? "" : v;
                  onChange({ packagePreset: key });
                  if (key) onApplyPreset(key);
                }}
              >
                <SelectTrigger className="max-w-xs rounded-xl">
                  <SelectValue placeholder="Paket wählen (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Manuell / ohne Vorgabe</SelectItem>
                  {Object.entries(PACKAGE_PRESETS).map(([key, p]) => (
                    <SelectItem key={key} value={key}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <ModuleTile
          icon={<Rocket className="h-4 w-4" />}
          title="Express-Zuschlag"
          hint="Prozentualer Aufschlag für Eilaufträge – eigene Zeile im Angebot."
          enabled={state.expressEnabled}
          onToggle={(v) => onChange({ expressEnabled: v })}
          amount={amounts.expressEur}
        >
          <div className="space-y-2 max-w-[10rem]">
            <Label>Zuschlag (%)</Label>
            <Input
              type="number"
              min={0}
              value={state.expressSurcharge || ""}
              onChange={(e) =>
                onChange({ expressSurcharge: parseDecimalInput(e.target.value, 0) })
              }
              className="bg-background/60 rounded-xl"
            />
          </div>
        </ModuleTile>

        <ModuleTile
          icon={<Server className="h-4 w-4" />}
          title="Hosting-Setup"
          hint="Einmalige Einrichtungsgebühr – eigene Zeile im Angebot."
          enabled={state.hostingEnabled}
          onToggle={(v) => onChange({ hostingEnabled: v })}
          amount={amounts.hostingEur}
        >
          <div className="space-y-2 max-w-[10rem]">
            <Label>Setup-Gebühr (€)</Label>
            <Input
              type="number"
              min={0}
              value={state.hostingFee || ""}
              onChange={(e) => onChange({ hostingFee: parseDecimalInput(e.target.value, 0) })}
              className="bg-background/60 rounded-xl"
            />
          </div>
        </ModuleTile>

        <ModuleTile
          icon={<Wrench className="h-4 w-4" />}
          title="Wartung & Support"
          hint="Monatliche Wartung über einen Zeitraum – eigene Zeile im Angebot."
          enabled={state.maintenanceEnabled}
          onToggle={(v) => onChange({ maintenanceEnabled: v })}
          amount={amounts.maintenanceEur}
        >
          <div className="grid gap-4 sm:grid-cols-2 max-w-md">
            <div className="space-y-2">
              <Label>Monate</Label>
              <Input
                type="number"
                min={1}
                value={state.maintenanceMonths || ""}
                onChange={(e) =>
                  onChange({
                    maintenanceMonths: Math.max(
                      0,
                      Math.floor(parseDecimalInput(e.target.value, 0))
                    ),
                  })
                }
                className="bg-background/60 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Monatlich (€)</Label>
              <Input
                type="number"
                min={0}
                value={state.maintenanceMonthly || ""}
                onChange={(e) =>
                  onChange({ maintenanceMonthly: parseDecimalInput(e.target.value, 0) })
                }
                className="bg-background/60 rounded-xl"
              />
            </div>
          </div>
        </ModuleTile>
      </CardContent>
    </Card>
  );
}
