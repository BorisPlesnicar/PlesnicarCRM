"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  FolderKanban,
  FileText,
  Receipt,
  Clock,
  Wallet,
  StickyNote,
  LayoutDashboard,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function HelpPage() {
  return (
    <div className="space-y-6 pb-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Hallo Papa! 👋</h1>
        <p className="text-xl text-muted-foreground">
          Eine kleine Einleitung in dein CRM-System
        </p>
      </div>

      {/* Welcome Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <p className="text-lg text-foreground leading-relaxed">
            Willkommen in deinem CRM-System! Hier kannst du alle deine Kunden, Projekte, 
            Angebote und Rechnungen verwalten. Diese Seite erklärt dir Schritt für Schritt, 
            wie alles funktioniert.
          </p>
        </CardContent>
      </Card>

      {/* Dashboard */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Dashboard (Übersicht)</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-foreground">
            Das Dashboard ist deine Startseite. Hier siehst du auf einen Blick:
          </p>
          <ul className="space-y-2 list-none">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span><strong>Offene Leads:</strong> Potenzielle neue Kunden, die noch keinen Auftrag haben</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span><strong>Aktive Projekte:</strong> Projekte, an denen du gerade arbeitest</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span><strong>Einnahmen (Monat):</strong> Wie viel Geld du diesen Monat eingenommen hast</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span><strong>Stunden (Monat):</strong> Wie viele Stunden du diesen Monat gearbeitet hast</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Kunden */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Kunden</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-foreground">
            Hier verwaltest du alle deine Kontakte. Jeder Kontakt kann drei verschiedene Status haben:
          </p>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="font-semibold text-blue-400 mb-1">🔵 Lead (Blau)</p>
              <p className="text-sm text-foreground">
                Ein <strong>Lead</strong> ist ein potenzieller Kunde. Das ist jemand, der sich 
                bei dir gemeldet hat, aber noch keinen Auftrag erteilt hat. 
                Beispiel: Jemand ruft an und fragt nach einem Angebot.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="font-semibold text-green-400 mb-1">🟢 Kunde (Grün)</p>
              <p className="text-sm text-foreground">
                Ein <strong>Kunde</strong> hat bereits einen Auftrag erteilt oder ein Projekt 
                bei dir in Auftrag gegeben. Sobald jemand einen Auftrag hat, solltest du 
                den Status von "Lead" auf "Kunde" ändern.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-gray-500/10 border border-gray-500/20">
              <p className="font-semibold text-gray-400 mb-1">⚫ Archiviert (Grau)</p>
              <p className="text-sm text-foreground">
                Ehemalige Kunden oder Kontakte, die nicht mehr aktiv sind, kannst du 
                archivieren. Sie bleiben gespeichert, erscheinen aber nicht mehr in der 
                normalen Liste.
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm font-semibold mb-2">💡 Tipp:</p>
            <p className="text-sm text-foreground">
              Jeder neue Kontakt wird automatisch als "Lead" angelegt. Wenn du den ersten 
              Auftrag bekommst, ändere den Status auf "Kunde".
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Projekte */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <FolderKanban className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Projekte</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-foreground">
            Projekte sind die Aufträge, die du für deine Kunden erledigst. Jedes Projekt 
            hat einen Status:
          </p>
          <ul className="space-y-2 list-none">
            <li className="flex items-start gap-2">
              <ArrowRight className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <span><strong>Geplant:</strong> Das Projekt ist geplant, aber noch nicht gestartet</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span><strong>Aktiv:</strong> Du arbeitest gerade an diesem Projekt</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <span><strong>Fertig:</strong> Das Projekt ist abgeschlossen</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Angebote */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Angebote</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-foreground">
            Hier erstellst du Angebote für deine Kunden. Du kannst zwischen zwei Arten wählen:
          </p>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="font-semibold text-blue-400 mb-1">💻 IT-Angebote</p>
              <p className="text-sm text-foreground">
                Für IT-Dienstleistungen (z.B. Webseiten, Software). Hier rechnest du mit 
                <strong> Stunden</strong> und <strong>Stundensätzen</strong>.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <p className="font-semibold text-orange-400 mb-1">🔨 BAU-Angebote</p>
              <p className="text-sm text-foreground">
                Für Bauarbeiten. Hier kannst du <strong>Fixpreise</strong> angeben 
                (z.B. "Fundamentdecke: 5.000€").
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rechnungen */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Receipt className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Rechnungen</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-foreground">
            Rechnungen werden automatisch nummeriert (z.B. BP-2248-01, BP-2248-02, ...). 
            Wichtig:
          </p>
          <ul className="space-y-2 list-none">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Wenn du eine Rechnung als <strong>"Bezahlt"</strong> markierst, wird 
              automatisch eine Einnahme erstellt</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Die Einnahme erscheint dann automatisch im Dashboard und bei 
              "Einnahmen & Ausgaben"</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Du kannst Rechnungen auch als PDF herunterladen</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Zeiterfassung */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Zeiterfassung</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-foreground">
            Hier kannst du deine Arbeitszeit für Projekte erfassen. Einfach Start drücken, 
            wenn du anfängst zu arbeiten, und Stop, wenn du fertig bist. Die Zeit wird 
            automatisch berechnet.
          </p>
        </CardContent>
      </Card>

      {/* Einnahmen & Ausgaben */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Wallet className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Einnahmen & Ausgaben</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-foreground">
            Hier siehst du alle deine Einnahmen und Ausgaben. Einnahmen werden automatisch 
            erstellt, wenn du eine Rechnung als "Bezahlt" markierst. Ausgaben kannst du 
            manuell eintragen (z.B. Materialkosten, Bürokosten, etc.).
          </p>
        </CardContent>
      </Card>

      {/* Notizen */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <StickyNote className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Notizen</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-foreground">
            Hier kannst du Notizen erstellen - für Ideen, Erinnerungen oder wichtige 
            Informationen. Du kannst auch Bilder hinzufügen. Jede Notiz zeigt, wer sie 
            erstellt hat.
          </p>
        </CardContent>
      </Card>

      {/* Quick Start */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <HelpCircle className="h-6 w-6" />
            Schnellstart - So fängst du an:
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="space-y-3 list-decimal list-inside">
            <li className="text-foreground">
              <strong>Neuen Kontakt anlegen:</strong> Gehe zu "Kunden" → "+ Neuer Kunde" 
              → Fülle die Daten aus → Speichern
            </li>
            <li className="text-foreground">
              <strong>Projekt erstellen:</strong> Gehe zu "Projekte" → "+ Neues Projekt" 
              → Wähle den Kunden → Speichern
            </li>
            <li className="text-foreground">
              <strong>Angebot erstellen:</strong> Gehe zu "Angebote" → "+ Neues Angebot" 
              → Wähle IT oder BAU → Fülle die Positionen aus → Speichern
            </li>
            <li className="text-foreground">
              <strong>Rechnung erstellen:</strong> Gehe zu "Rechnungen" → "+ Neue Rechnung" 
              → Wähle den Kunden → Fülle die Positionen aus → Speichern
            </li>
            <li className="text-foreground">
              <strong>Rechnung als bezahlt markieren:</strong> Öffne die Rechnung → 
              Wähle "Bezahlt" im Status-Dropdown → Die Einnahme wird automatisch erstellt
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Footer */}
      <Card className="border-border bg-card">
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">
            Bei Fragen oder Problemen einfach melden! 😊
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
