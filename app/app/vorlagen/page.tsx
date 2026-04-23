"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ArrowLeft, Printer, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function VorlagenPage() {
  const router = useRouter();

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vorlagen</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Druckbare Formulare mit Ihren Firmendaten – Zeilen und Spalten zum händischen Ausfüllen
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/60 bg-card/80 backdrop-blur-xl shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5" />
              BESTELLSCHEIN / ANGEBOT
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Vorlage wie das klassische Bestellschein-Formular: Ihre Firma (Logo, Boris Plesnicar e.U.), Kundenfelder (Firma, Name, Straße, Ort, Tel.), Datum/Bauführer, Baustelle, Tabelle (Menge, Artikel, Bearbeiter, Einzel €, Summe €), Zufuhr/Termin/Gesamt, USt, Bedingungen, Unterschriften und rechtlicher Hinweis.
            </p>
            <Button asChild>
              <Link href="/app/vorlagen/formular" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Anzeigen & Drucken
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-xl shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Kundenanlageblatt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Eine A4-Seite, tabellarisch wie ein klassisches Stammdatenblatt: Gewerbe/Privat-Häkchen, Felder
              nebeneinander (Vor-/Nachname, PLZ/Ort, UID/FB, Telefon/Mobil), Baustellenadresse und Unterschrift.
            </p>
            <Button asChild>
              <Link
                href="/app/vorlagen/kundenanlage"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Öffnen, Drucken & PDF
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
