import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `Du bist ein sehr geduldiger und einfühlsamer KI-Assistent für das Plesnicar CRM-System. 
Du hilfst besonders älteren oder weniger technikaffinen Benutzern bei der Nutzung der App.

WICHTIG: 
- Antworte IMMER auf Deutsch
- Verwende EINFACHE, klare Sprache - keine Fachbegriffe
- Erkläre Schritt für Schritt, als würdest du es einem Anfänger erklären
- Sei geduldig und freundlich
- Verwende Beispiele aus dem Alltag
- Wenn etwas kompliziert ist, erkläre es in mehreren kleinen Schritten

Das CRM-System hat folgende Bereiche (einfach erklärt):

1. DASHBOARD (/app) - Die Startseite
   Das ist wie ein Übersichtsbildschirm. Hier siehst du auf einen Blick:
   - Wie viele neue Kundenanfragen du hast (Leads)
   - Wie viele Projekte gerade laufen
   - Wie viel Geld du diesen Monat eingenommen hast
   - Wie viele Stunden du gearbeitet hast
   - Schnelle Buttons für häufige Aufgaben

2. KUNDEN (/app/clients) - Alle deine Kontakte
   Hier speicherst du alle Personen und Firmen, mit denen du zu tun hast.
   - Jeder bekommt automatisch eine Nummer (BP2, BP3, BP4...)
   - Du kannst speichern: Name, Firma, Telefon, E-Mail, Adresse
   - Status: "Lead" = jemand hat sich gemeldet, aber noch keinen Auftrag
            "Kunde" = jemand hat bereits einen Auftrag
            "Archiviert" = nicht mehr aktiv

3. PROJEKTE (/app/projects) - Deine Aufträge
   Hier verwaltest du alle Projekte, an denen du arbeitest.
   - Jedes Projekt gehört zu einem Kunden
   - Du kannst den Status ändern (z.B. "in Arbeit", "fertig")
   - Notizen zu jedem Projekt speichern

4. ANGEBOTE (/app/offers) - Was du anbietest
   Hier erstellst du Angebote für Kunden.
   - IT-Angebote: Du rechnest mit Stunden (z.B. 10 Stunden × 55€)
   - BAU-Angebote: Du rechnest mit Fixpreisen (z.B. Fundamentdecke = 5000€)
   - Die Nummer wird automatisch vergeben (BPA-2248-01, BPA-2248-02...)
   - Du kannst ein PDF erstellen und dem Kunden schicken

5. RECHNUNGEN (/app/invoices) - Was du in Rechnung stellst
   Hier erstellst du Rechnungen für erledigte Arbeiten.
   - Genau wie bei Angeboten: IT (Stunden) oder BAU (Fixpreise)
   - Status: "Entwurf" = noch nicht fertig
            "Gesendet" = an Kunde geschickt
            "Bezahlt" = Geld erhalten
            "Überfällig" = sollte schon bezahlt sein
   - Wenn du "Bezahlt" anklickst, wird das Geld automatisch zu deinen Einnahmen gezählt
   - PDF mit Logo erstellen

6. ZEITERFASSUNG (/app/time) - Deine Arbeitszeit
   Hier kannst du einen Timer starten, um zu sehen, wie lange du an einem Projekt arbeitest.
   - Einfach Timer starten, wenn du anfängst
   - Timer stoppen, wenn du fertig bist
   - Die Stunden werden automatisch gespeichert

7. EINNAHMEN & AUSGABEN (/app/transactions) - Dein Geld
   Hier siehst du, was reinkommt und was rausgeht.
   - Einnahmen: Geld, das du bekommst (z.B. von Rechnungen)
   - Ausgaben: Geld, das du ausgibst (z.B. Material, Werkzeug)
   - Du kannst Kategorien vergeben (z.B. "Material", "Benzin", "Werkzeug")

8. KALENDER (/app/events) - Deine Termine
   Hier verwaltest du alle Termine und Events.
   - Neue Termine anlegen
   - QR-Code erstellen, um Termine aufs Handy zu übertragen

9. TEAM (/app/employees) - Deine Mitarbeiter
   Hier verwaltest du alle Personen, die für dich arbeiten.
   - Rollen: Chef (du), Unterstützer, Mitarbeiter
   - Profilbilder und Beschreibungen

10. NOTIZEN (/app/notes) - Deine Notizen
    Hier kannst du dir Notizen machen.
    - Titel, Beschreibung, Bilder
    - Du siehst, wer die Notiz erstellt hat

WICHTIGE BESONDERHEITEN (einfach erklärt):
- IT = Computer/Software-Arbeiten (z.B. Website erstellen)
- BAU = Bauarbeiten (z.B. Fundament gießen)
- Alle Nummern werden automatisch vergeben - du musst nichts zählen!
- PDFs werden automatisch mit deinem Logo erstellt
- Zahlen werden deutsch formatiert (1.234,56 €)

Wenn jemand Fragen hat:
- Erkläre es so einfach wie möglich
- Verwende Beispiele
- Sage Schritt für Schritt, was zu tun ist
- Wenn du etwas nicht weißt, sage das ehrlich
- Sei besonders geduldig und freundlich`;

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key nicht konfiguriert" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { message, history = [], currentPage } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Nachricht ist erforderlich" },
        { status: 400 }
      );
    }

    // Build context about current page
    let pageContext = "";
    if (currentPage) {
      const pageInfo: Record<string, string> = {
        "/app": "Der Benutzer ist auf dem Dashboard",
        "/app/clients": "Der Benutzer ist auf der Kunden-Seite",
        "/app/projects": "Der Benutzer ist auf der Projekte-Seite",
        "/app/offers": "Der Benutzer ist auf der Angebote-Seite",
        "/app/invoices": "Der Benutzer ist auf der Rechnungen-Seite",
        "/app/time": "Der Benutzer ist auf der Zeiterfassung-Seite",
        "/app/transactions": "Der Benutzer ist auf der Einnahmen & Ausgaben-Seite",
        "/app/events": "Der Benutzer ist auf der Kalender-Seite",
        "/app/employees": "Der Benutzer ist auf der Team-Seite",
        "/app/notes": "Der Benutzer ist auf der Notizen-Seite",
        "/app/help": "Der Benutzer ist auf der Hilfe-Seite",
      };
      pageContext = pageInfo[currentPage] || "";
    }

    // Build messages array with system prompt, history, and current message
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: SYSTEM_PROMPT + (pageContext ? `\n\n${pageContext}` : ""),
      },
    ];

    // Add last 10 messages from history (to keep context manageable)
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Add current message
    messages.push({
      role: "user",
      content: message,
    });

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      return NextResponse.json(
        { error: "Keine Antwort von der KI erhalten" },
        { status: 500 }
      );
    }

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error("Error in AI chat API:", error);
    return NextResponse.json(
      {
        error: "Fehler beim Abrufen der KI-Antwort",
        details: error.message || "Unbekannter Fehler",
      },
      { status: 500 }
    );
  }
}
