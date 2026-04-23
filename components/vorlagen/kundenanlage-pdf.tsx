"use client";

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

const RED = "#DC2626";
const BORDER = "#1a1a1a";
const LABEL = "#333";
const ROW_H = 26;

const s = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 36,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  senderLeft: {
    flex: 1,
    paddingRight: 12,
  },
  senderCompany: {
    color: RED,
    fontWeight: 700,
    fontSize: 10,
    marginBottom: 2,
  },
  senderLine: {
    fontSize: 8,
    color: "#444",
    lineHeight: 1.35,
  },
  logoWrap: { alignItems: "flex-end" },
  logo: { width: 170, height: 42, objectFit: "contain" },
  headerBar: {
    width: "100%",
    height: 3,
    backgroundColor: RED,
    marginTop: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 22,
    marginBottom: 6,
  },
  checkbox: {
    width: 11,
    height: 11,
    borderWidth: 1,
    borderColor: BORDER,
    marginRight: 6,
  },
  typeLabel: { fontSize: 11, fontWeight: 700 },
  required: {
    marginLeft: "auto",
    fontSize: 8,
    color: RED,
    fontStyle: "italic",
  },
  requiredInline: {
    color: RED,
  },

  // Tabellen-Raster (echte borders)
  gridRow: {
    flexDirection: "row",
    minHeight: ROW_H,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: BORDER,
  },
  gridRowLast: {
    borderBottomWidth: 1,
  },
  cell: {
    paddingHorizontal: 6,
    paddingTop: 3,
    justifyContent: "flex-start",
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  cellLast: {
    paddingHorizontal: 6,
    paddingTop: 3,
  },
  cellHalf: { width: "50%" },
  cellFull: { width: "100%" },
  cellPLZ: { width: "24%" },
  cellOrt: { width: "76%" },

  label: {
    fontSize: 8.5,
    color: LABEL,
  },

  // Abschnitt-Überschrift
  sectionTitle: {
    fontSize: 10.5,
    fontWeight: 700,
    marginTop: 8,
    marginBottom: 3,
  },

  // Größere Anmerkungszelle
  noteRow: {
    flexDirection: "row",
    minHeight: 40,
    borderWidth: 1,
    borderColor: BORDER,
    borderTopWidth: 0,
  },
  noteCell: {
    paddingHorizontal: 6,
    paddingTop: 3,
    width: "100%",
  },

  // Signatur
  signRow: {
    flexDirection: "row",
    gap: 28,
    marginTop: 14,
  },
  signCol: { flex: 1 },
  signLine: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    height: 30,
    marginBottom: 4,
  },
  signCaption: { fontSize: 8, color: "#444" },

  // Footer kompakt
  footerWrap: {
    marginTop: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: "#666",
  },
  footerCol: { width: "25%" },
  footerTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: "#1a1a1a",
    marginBottom: 2,
  },
  footerText: { fontSize: 7, color: "#555", lineHeight: 1.4 },

  // Datenschutz-Block (DSGVO)
  privacyWrap: {
    marginTop: 8,
  },
  privacyTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: "#1a1a1a",
    marginBottom: 3,
  },
  privacyText: {
    fontSize: 6.8,
    color: "#444",
    lineHeight: 1.4,
    textAlign: "justify",
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
  },
  consentCheckbox: {
    width: 9,
    height: 9,
    borderWidth: 1,
    borderColor: BORDER,
    marginRight: 6,
    marginTop: 1,
  },
  consentText: {
    flex: 1,
    fontSize: 6.8,
    color: "#333",
    lineHeight: 1.4,
  },
});

export type KundenanlagePDFProps = { logoUrl: string };

type CellStyle = { width?: string | number; minHeight?: number };

function LabeledCell({
  label,
  required,
  style,
  last,
}: {
  label: string;
  required?: boolean;
  style?: CellStyle;
  last?: boolean;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- react-pdf types have restrictive Style unions that clash with our generic object
  const baseStyle: any = last ? s.cellLast : s.cell;
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <View style={[baseStyle, style as any]}>
      <Text style={s.label}>
        {label}
        {required ? <Text style={s.requiredInline}>*</Text> : null}
      </Text>
    </View>
  );
}

export function KundenanlagePDFDocument({ logoUrl }: KundenanlagePDFProps) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header mit Absender + Logo */}
        <View style={s.header}>
          <View style={s.senderLeft}>
            <Text style={s.senderCompany}>Boris Plesnicar e.U.</Text>
            <Text style={s.senderLine}>
              plesnicaroffice@gmail.com · www.plesnicarsolutions.at
            </Text>
            <Text style={s.senderLine}>
              Hartriegelstraße 12, 3550 Langenlois · Tel. +43 664 4678382 · +43 676 3206308
            </Text>
          </View>
          <View style={s.logoWrap}>
            <Image src={logoUrl} style={s.logo} />
          </View>
        </View>
        <View style={s.headerBar} />

        <Text style={s.title}>KUNDENANLAGEBLATT</Text>

        <View style={s.typeRow}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={s.checkbox} />
            <Text style={s.typeLabel}>Gewerbe</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={s.checkbox} />
            <Text style={s.typeLabel}>Privat</Text>
          </View>
          <Text style={s.required}>*Pflichtfeld</Text>
        </View>

        {/* Stammdaten – 2 Spalten nebeneinander */}
        <View style={s.gridRow}>
          <LabeledCell label="Vorname:" required style={s.cellHalf} />
          <LabeledCell label="Nachname:" required style={s.cellHalf} last />
        </View>
        <View style={s.gridRow}>
          <LabeledCell label="Firmenname: (wenn Gewerbe)" style={s.cellFull} last />
        </View>
        <View style={s.gridRow}>
          <LabeledCell label="Adresse:" required style={s.cellFull} last />
        </View>
        <View style={s.gridRow}>
          <LabeledCell label="Postleitzahl:" required style={s.cellPLZ} />
          <LabeledCell label="Ort:" required style={s.cellOrt} last />
        </View>
        <View style={s.gridRow}>
          <LabeledCell label="UID-Nr.: (wenn Gewerbe & vorhanden)" style={s.cellHalf} />
          <LabeledCell label="Firmenbuchnr.: (wenn Gewerbe)" style={s.cellHalf} last />
        </View>
        <View style={s.gridRow}>
          <LabeledCell label="Telefon:" required style={s.cellHalf} />
          <LabeledCell label="Mobil:" style={s.cellHalf} last />
        </View>
        <View style={[s.gridRow, s.gridRowLast, { minHeight: 36 }]}>
          <LabeledCell
            label="E-Mail-Adresse zuständiger Ansprechpartner/Besteller:"
            required
            style={s.cellFull}
            last
          />
        </View>

        {/* Baustelle / Lieferadresse */}
        <Text style={s.sectionTitle}>Baustelle / Lieferadresse</Text>
        <View style={s.gridRow}>
          <LabeledCell label="Adresse:" style={s.cellFull} last />
        </View>
        <View style={s.gridRow}>
          <LabeledCell label="Postleitzahl:" style={s.cellPLZ} />
          <LabeledCell label="Ort:" style={s.cellOrt} last />
        </View>
        <View style={[s.gridRow, s.gridRowLast]}>
          <LabeledCell label="Telefon:" style={s.cellHalf} />
          <LabeledCell label="Mobil:" style={s.cellHalf} last />
        </View>

        {/* Anmerkungen (höhere Zelle zum Schreiben) */}
        <View style={s.noteRow}>
          <View style={s.noteCell}>
            <Text style={s.label}>Anmerkungen / Besteller / Warenübernehmer etc.:</Text>
          </View>
        </View>

        {/* Datenschutzhinweis (DSGVO / GDPR) */}
        <View style={s.privacyWrap}>
          <Text style={s.privacyTitle}>Datenschutzhinweis</Text>
          <Text style={s.privacyText}>
            Verantwortlicher: Boris Plesnicar e.U., Hartriegelstraße 12, 3550 Langenlois, plesnicaroffice@gmail.com. Ihre
            personenbezogenen Daten (Stamm-, Kontakt-, Vertrags- und Rechnungsdaten) werden zur Anbahnung und Abwicklung
            der Geschäftsbeziehung verarbeitet (Art. 6 Abs. 1 lit. b DSGVO) sowie zur Erfüllung rechtlicher Pflichten,
            insb. steuerrechtlicher Aufbewahrung (Art. 6 Abs. 1 lit. c DSGVO). Eine Weitergabe erfolgt nur an gesetzlich
            verpflichtete Stellen (z. B. Finanzamt) und beauftragte Auftragsverarbeiter (z. B. Buchhaltung, Hosting,
            IT). Die Speicherdauer richtet sich nach den gesetzlichen Aufbewahrungsfristen (i. d. R. 7 Jahre gemäß
            BAO/UGB). Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit,
            Widerspruch sowie auf Beschwerde bei der Datenschutzbehörde (dsb.gv.at).
          </Text>
          <View style={s.consentRow}>
            <View style={s.consentCheckbox} />
            <Text style={s.consentText}>
              Ich bestätige den Erhalt des Datenschutzhinweises und stimme der Verarbeitung meiner Daten zu den oben
              genannten Zwecken zu. Eine Einwilligung kann jederzeit formlos widerrufen werden.
            </Text>
          </View>
          <View style={s.consentRow}>
            <View style={s.consentCheckbox} />
            <Text style={s.consentText}>
              Ich bin damit einverstanden, Angebote, Rechnungen und geschäftsbezogene Mitteilungen per E-Mail an die
              oben angegebene Adresse zu erhalten. (Widerruf jederzeit möglich.)
            </Text>
          </View>
        </View>

        {/* Unterschrift */}
        <View style={s.signRow}>
          <View style={s.signCol}>
            <View style={s.signLine} />
            <Text style={s.signCaption}>
              Ort, Datum<Text style={s.requiredInline}>*</Text>
            </Text>
          </View>
          <View style={s.signCol}>
            <View style={s.signLine} />
            <Text style={s.signCaption}>
              Unterschrift<Text style={s.requiredInline}>*</Text>
            </Text>
          </View>
        </View>

        {/* Kompakter Footer mit Firmendaten */}
        <View style={s.footerWrap}>
          <View style={s.footerRow}>
            <View style={s.footerCol}>
              <Text style={s.footerTitle}>Plesnicar Solutions</Text>
              <Text style={s.footerText}>Hartriegelstraße 12</Text>
              <Text style={s.footerText}>3550 Langenlois, Österreich</Text>
              <Text style={s.footerText}>GF Boris Plesnicar</Text>
            </View>
            <View style={s.footerCol}>
              <Text style={s.footerTitle}>Kontakt</Text>
              <Text style={s.footerText}>+43 664 4678382</Text>
              <Text style={s.footerText}>plesnicaroffice@gmail.com</Text>
              <Text style={s.footerText}>www.plesnicarsolutions.at</Text>
            </View>
            <View style={s.footerCol}>
              <Text style={s.footerTitle}>Bankverbindung</Text>
              <Text style={s.footerText}>Raiba Langenlois</Text>
              <Text style={s.footerText}>AT37 3242 6000 0008 1968</Text>
              <Text style={s.footerText}>BIC: RLNWATWW426</Text>
            </View>
            <View style={s.footerCol}>
              <Text style={s.footerTitle}>Gerichtsstand</Text>
              <Text style={s.footerText}>3500 Krems a.d. Donau</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
