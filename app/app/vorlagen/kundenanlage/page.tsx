"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, FileDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { pdf } from "@react-pdf/renderer";
import { KundenanlagePDFDocument } from "@/components/vorlagen/kundenanlage-pdf";
import { toast } from "sonner";

export default function KundenanlageVorlagePage() {
  const router = useRouter();
  const [savingPdf, setSavingPdf] = useState(false);
  const [printing, setPrinting] = useState(false);

  async function getPdfBlob() {
    const logoUrl =
      typeof window !== "undefined" ? `${window.location.origin}/LogoTEXTBLACK.png` : "";
    const doc = <KundenanlagePDFDocument logoUrl={logoUrl} />;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdf() expects DocumentProps
    return await pdf(doc as any).toBlob();
  }

  async function handlePrint() {
    setPrinting(true);
    try {
      const blob = await getPdfBlob();
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.print();
          } finally {
            setTimeout(() => {
              document.body.removeChild(iframe);
              URL.revokeObjectURL(url);
            }, 500);
          }
        }, 600);
      };
      toast.success("Druckdialog geöffnet.");
    } catch (e) {
      console.error(e);
      toast.error("Druckansicht konnte nicht erstellt werden.");
    } finally {
      setPrinting(false);
    }
  }

  async function handleSavePdf() {
    setSavingPdf(true);
    try {
      const blob = await getPdfBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Kundenanlageblatt.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF gespeichert");
    } catch (e) {
      console.error(e);
      toast.error("PDF konnte nicht erstellt werden.");
    } finally {
      setSavingPdf(false);
    }
  }

  return (
    <>
      <div className="print:hidden p-4 border-b border-border/60 bg-card/80 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 sticky top-0 z-10">
        <Button variant="ghost" size="sm" onClick={() => router.push("/app/vorlagen")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zu Vorlagen
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handlePrint} className="gap-2 border-border/60" disabled={printing}>
            {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            Drucken
          </Button>
          <Button
            onClick={handleSavePdf}
            className="gap-2 bg-primary text-primary-foreground hover:bg-red-700"
            disabled={savingPdf}
          >
            {savingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Als PDF speichern
          </Button>
        </div>
      </div>

      <div className="px-4 py-8 max-w-3xl mx-auto space-y-4 print:hidden">
        <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-6 shadow-none">
          <h1 className="text-xl font-semibold text-foreground">Kundenanlageblatt</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Eine A4-Seite im Stammdaten-Stil: Häkchen Gewerbe/Privat, Felder nebeneinander, Baustellenadresse,
            Unterschrift und kompakter Firmen-Footer. Drucken oder PDF speichern.
          </p>
        </div>
      </div>

      <p className="sr-only print:not-sr-only">
        Kundenanlageblatt – bitte PDF drucken oder gespeicherte Datei öffnen.
      </p>
    </>
  );
}
