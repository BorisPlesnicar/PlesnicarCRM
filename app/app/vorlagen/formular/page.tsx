"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, FileDown, ImageDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { pdf } from "@react-pdf/renderer";
import html2canvas from "html2canvas";
import { FormularPDFDocument } from "@/components/vorlagen/formular-pdf";
import { toast } from "sonner";

const ROWS = 15;

export default function FormularVorlagePage() {
  const router = useRouter();
  const previewRef = useRef<HTMLDivElement>(null);
  const [savingPdf, setSavingPdf] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [savingImage, setSavingImage] = useState(false);

  async function getPdfBlob() {
    const logoUrl = typeof window !== "undefined" ? `${window.location.origin}/LogoTEXTBLACK.png` : "";
    const doc = <FormularPDFDocument logoUrl={logoUrl} />;
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
        // Kurz warten, damit das PDF vollständig gerendert ist bevor die Druckvorschau kommt
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
      toast.success("Druckdialog geöffnet – es wird nur das Formular gedruckt.");
    } catch (e) {
      console.error(e);
      toast.error("Fehler beim Erstellen der Druckansicht");
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
      a.download = "BESTELLSCHEIN_ANGEBOT_Formular.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF gespeichert");
    } catch (e) {
      console.error(e);
      toast.error("Fehler beim Erstellen der PDF");
    } finally {
      setSavingPdf(false);
    }
  }

  async function handleSaveImage() {
    if (!previewRef.current) return;
    setSavingImage(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: "#ffffff",
        foreignObjectRendering: false,
        onclone(_, clonedEl) {
          clonedEl.style.backgroundColor = "#ffffff";
          clonedEl.style.color = "#000000";
        },
      });
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "BESTELLSCHEIN_ANGEBOT_Formular.png";
      a.click();
      toast.success("Bild gespeichert");
    } catch (e) {
      console.error(e);
      toast.error("Fehler beim Erstellen des Bildes");
    } finally {
      setSavingImage(false);
    }
  }

  return (
    <>
      <div className="print:hidden p-4 border-b border-border bg-background flex items-center justify-between sticky top-0 z-10">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} className="gap-2" disabled={printing}>
            {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            Drucken
          </Button>
          <Button onClick={handleSavePdf} className="gap-2" disabled={savingPdf}>
            {savingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Als PDF speichern
          </Button>
          <Button variant="outline" onClick={handleSaveImage} className="gap-2" disabled={savingImage}>
            {savingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageDown className="h-4 w-4" />}
            Als Bild speichern
          </Button>
        </div>
      </div>

      <div
        ref={previewRef}
        className="p-6 md:p-10 max-w-[210mm] mx-auto print:p-8 print:max-w-none print:text-black"
        style={{ backgroundColor: "#ffffff", color: "#000000" }}
      >
        {/* Seite 1 von 1 - hex damit html2canvas kein lab() parsen muss */}
        <p className="text-center text-xs mb-4 print:mb-2" style={{ color: "#6b7280" }}>Seite 1 von 1</p>

        {/* Header: Logo + Firmenname links, ggf. Slogan/2026 rechts */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/LogoTEXTBLACK.png" alt="Plesnicar Solutions" className="h-12 w-auto object-contain" crossOrigin="anonymous" />
              <div>
                <p className="text-xl font-bold italic">Boris Plesnicar e.U.</p>
                <p className="text-sm">Hartriegelstraße 12, 3550 Langenlois, Tel. 0664/4678382</p>
              </div>
            </div>
          </div>
          <p className="text-sm italic text-right">2026</p>
        </div>

        {/* Zwei Spalten: Kunde links | BESTELLSCHEIN/ANGEBOT + Datum/Bauführer rechts – mehr Abstand oben */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-4 mt-6">
          <div className="space-y-3 text-sm w-full min-w-0">
            <div className="flex gap-2 w-full"><span className="w-32 shrink-0">FIRMA</span><span className="flex-1 min-w-0 border-b border-black" /></div>
            <div className="flex gap-2 w-full"><span className="w-32 shrink-0">HERRN / FRAU</span><span className="flex-1 min-w-0 border-b border-black" /></div>
            <div className="flex gap-2 w-full"><span className="w-32 shrink-0">VOR- UND ZUNAME</span><span className="flex-1 min-w-0 border-b border-black" /></div>
            <div className="flex gap-2 w-full"><span className="w-32 shrink-0">STRASSE</span><span className="flex-1 min-w-0 border-b border-black" /></div>
            <div className="flex gap-2 w-full"><span className="w-32 shrink-0">POSTLEITZAHL</span><span className="flex-1 min-w-0 border-b border-black" /></div>
            <div className="flex gap-2 w-full"><span className="w-32 shrink-0">ORT</span><span className="flex-1 min-w-0 border-b border-black" /></div>
            <div className="flex gap-2 w-full"><span className="w-32 shrink-0">TEL.</span><span className="flex-1 min-w-0 border-b border-black" /></div>
          </div>
          <div>
            <p className="text-2xl font-bold mb-1">BESTELLSCHEIN</p>
            <p className="text-2xl font-bold mb-4">ANGEBOT</p>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2"><span className="w-24 shrink-0">DATUM</span><span className="flex-1 border-b border-black" /></div>
              <div className="flex gap-2"><span className="w-24 shrink-0">BEARBEITER</span><span className="flex-1 border-b border-black" /></div>
            </div>
          </div>
        </div>

        {/* Baustelle */}
        <div className="mb-3 text-sm">
          <span className="font-semibold">BAUSTELLE</span>
          <div className="border-b border-black mt-0.5" />
        </div>

        {/* Bestelltext */}
        <p className="text-sm mb-3">
          ich (wir) bestell/en hiermit bei der Firma <strong>Boris Plesnicar e.U.</strong> auf Grund der unten angeführten Lieferbedingungen folgende Waren:
        </p>

        {/* Haupttabelle: MENGE | ARTIKEL | EINZEL € | SUMME € - hex für html2canvas */}
        <table className="w-full border-collapse border border-black text-sm" style={{ borderColor: "#000" }}>
          <thead>
            <tr style={{ backgroundColor: "#f3f4f6" }}>
              <th className="border border-black py-1.5 px-2 text-left font-semibold w-14" style={{ borderColor: "#000" }}>MENGE</th>
              <th className="border py-1.5 px-2 text-left font-semibold" style={{ borderColor: "#000" }}>ARTIKEL</th>
              <th className="border py-1.5 px-2 text-right font-semibold w-20" style={{ borderColor: "#000" }}>EINZEL €</th>
              <th className="border py-1.5 px-2 text-right font-semibold w-20" style={{ borderColor: "#000" }}>SUMME €</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROWS }).map((_, i) => (
              <tr key={i}>
                <td className="border py-1 px-2" style={{ borderColor: "#000" }}>&nbsp;</td>
                <td className="border py-1 px-2" style={{ borderColor: "#000" }}>&nbsp;</td>
                <td className="border py-1 px-2 text-right" style={{ borderColor: "#000" }}>&nbsp;</td>
                <td className="border py-1 px-2 text-right" style={{ borderColor: "#000" }}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summe rechts */}
        <div className="flex justify-end mt-4 text-sm">
          <div className="w-48">
            <span className="font-semibold">SUMME €</span>
            <div className="border-b border-black mt-0.5" />
          </div>
        </div>

        {/* Kleinunternehmerhinweis */}
        <p className="text-sm mt-3">
          Kleinunternehmer gem. § 6 Abs 1 Z 27 UStG.
        </p>

        {/* Bedingungen */}
        <div className="mt-3 text-sm">
          <span className="font-semibold">Bedingungen:</span>
          <div className="border-b border-black mt-0.5 min-h-[2em]" />
        </div>

        {/* Unterschriften */}
        <div className="grid grid-cols-2 gap-8 mt-8">
          <div>
            <div className="border-b border-black min-h-[2.5em] mb-1" />
            <p className="text-xs">Unterschrift Kunde</p>
          </div>
          <div>
            <div className="border-b border-black min-h-[2.5em] mb-1" />
            <p className="text-xs">Unterschrift</p>
          </div>
        </div>

        {/* Footer - hex für html2canvas */}
        <div className="flex justify-between items-end mt-8 pt-4 text-xs border-t" style={{ borderColor: "#d1d5db" }}>
          <p className="max-w-[65%] leading-tight">
            Die gelieferten Waren bleiben bis zur vollständigen Begleichung des Gegenwertes ausschließliches Eigentum der Firma Plesnicar Solutions.
          </p>
          <div className="text-right">
            <p className="font-semibold">Boris Plesnicar e.U.</p>
            <p>Hartriegelstraße 12</p>
            <p>3550 Langenlois</p>
          </div>
        </div>
      </div>
    </>
  );
}
