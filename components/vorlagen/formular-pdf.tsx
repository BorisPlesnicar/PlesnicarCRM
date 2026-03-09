"use client";

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

const ROWS = 15;

const s = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  center: { textAlign: "center" as const },
  bold: { fontWeight: 700 },
  row: { flexDirection: "row", marginBottom: 5 },
  label: { width: 90, marginRight: 8 },
  line: { flex: 1, borderBottomWidth: 1, borderBottomColor: "#000" },
  colRight: { flex: 1, paddingLeft: 20 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  footerContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
  },
  footerRow: { flexDirection: "row", fontSize: 9 },
  footerLeft: { flex: 1, paddingRight: 16 },
  footerRight: { width: 120 },
  table: { width: "100%", marginTop: 8, borderWidth: 1, borderColor: "#000" },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: "#000" },
  tableHeader: { flexDirection: "row", backgroundColor: "#eee", borderBottomWidth: 1, borderColor: "#000" },
  cell: { borderRightWidth: 1, borderColor: "#000", padding: 5, fontSize: 10 },
  cellLast: { padding: 5, fontSize: 10 },
  th: { padding: 5, fontSize: 10, fontFamily: "Helvetica-Bold" },
  td: { padding: 5, fontSize: 10 },
  colMenge: { width: "14%" },
  colArtikel: { width: "56%" },
  colEinzel: { width: "15%", textAlign: "right" as const },
  colSumme: { width: "15%", textAlign: "right" as const },
  grid2: { flexDirection: "row", marginTop: 8, gap: 24 },
  grid2Item: { flex: 1 },
  signContainer: {
    marginTop: 12,
  },
  signRow: { flexDirection: "row", gap: 40 },
  signBox: { flex: 1 },
  signLine: { borderBottomWidth: 1, borderBottomColor: "#000", height: 26, marginBottom: 4 },
});

type FormularPDFProps = { logoUrl?: string };

export function FormularPDFDocument({ logoUrl }: FormularPDFProps) {
  const src = logoUrl || (typeof window !== "undefined" ? `${window.location.origin}/LogoTEXTBLACK.png` : "/LogoTEXTBLACK.png");
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={[s.center, { marginBottom: 10, fontSize: 9, color: "#666" }]}>Seite 1 von 1</Text>

        <View style={s.row}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <Image src={src} style={{ width: 80, height: 28 }} />
            <View style={{ marginLeft: 12 }}>
              <Text style={[s.bold, { fontSize: 12 }]}>Boris Plesnicar e.U.</Text>
              <Text style={{ fontSize: 9 }}>Hartriegelstraße 12, 3550 Langenlois, Tel. 0664/4678382</Text>
            </View>
          </View>
          <Text style={{ fontSize: 10 }}>2026</Text>
        </View>

        <View style={[s.row, { marginTop: 16 }]}>
          <View style={{ flex: 1 }}>
            <View style={s.row}><Text style={s.label}>FIRMA</Text><View style={s.line} /></View>
            <View style={s.row}><Text style={s.label}>HERRN / FRAU</Text><View style={s.line} /></View>
            <View style={s.row}><Text style={s.label}>VOR- UND ZUNAME</Text><View style={s.line} /></View>
            <View style={s.row}><Text style={s.label}>STRASSE</Text><View style={s.line} /></View>
            <View style={s.row}><Text style={s.label}>POSTLEITZAHL</Text><View style={s.line} /></View>
            <View style={s.row}><Text style={s.label}>ORT</Text><View style={s.line} /></View>
            <View style={s.row}><Text style={s.label}>TEL.</Text><View style={s.line} /></View>
          </View>
          <View style={s.colRight}>
            <Text style={s.title}>BESTELLSCHEIN</Text>
            <Text style={s.title}>ANGEBOT</Text>
            <View style={{ marginTop: 16 }}>
              <View style={s.row}><Text style={{ width: 60, marginRight: 8 }}>DATUM</Text><View style={s.line} /></View>
              <View style={s.row}><Text style={{ width: 60, marginRight: 8 }}>BEARBEITER</Text><View style={s.line} /></View>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 10 }}>
          <Text style={s.bold}>BAUSTELLE</Text>
          <View style={[s.line, { marginTop: 4, marginBottom: 0 }]} />
        </View>

        <Text style={{ marginTop: 10, marginBottom: 8 }}>
          ich (wir) bestell/en hiermit bei der Firma <Text style={s.bold}>Boris Plesnicar e.U.</Text> auf Grund der unten angeführten Lieferbedingungen folgende Waren:
        </Text>

        <View style={s.table}>
          <View style={s.tableHeader}>
            <View style={[s.cell, s.colMenge]}><Text style={s.th}>MENGE</Text></View>
            <View style={[s.cell, s.colArtikel]}><Text style={s.th}>ARTIKEL</Text></View>
            <View style={[s.cell, s.colEinzel]}><Text style={s.th}>EINZEL €</Text></View>
            <View style={[s.cellLast, s.colSumme]}><Text style={s.th}>SUMME €</Text></View>
          </View>
          {Array.from({ length: ROWS }).map((_, i) => (
            <View key={i} style={s.tableRow}>
              <View style={[s.cell, s.colMenge]}><Text style={s.td}>{""}</Text></View>
              <View style={[s.cell, s.colArtikel]}><Text style={s.td}>{""}</Text></View>
              <View style={[s.cell, s.colEinzel]}><Text style={s.td}>{""}</Text></View>
              <View style={[s.cellLast, s.colSumme]}><Text style={s.td}>{""}</Text></View>
            </View>
          ))}
        </View>

        <View style={[s.grid2, { justifyContent: "flex-end" }]}>
          <View style={{ width: "50%", maxWidth: 200 }}>
            <Text style={s.bold}>SUMME €</Text>
            <View style={[s.line, { marginTop: 4 }]} />
          </View>
        </View>

        <Text style={{ marginTop: 10 }}>Kleinunternehmer gem. § 6 Abs 1 Z 27 UStG.</Text>

        <View style={{ marginTop: 8 }}>
          <Text style={s.bold}>Bedingungen:</Text>
          <View style={[s.line, { marginTop: 4, height: 18 }]} />
        </View>

        <View style={s.signContainer}>
          <View style={s.signRow}>
            <View style={s.signBox}>
              <View style={s.signLine} />
              <Text style={{ fontSize: 9 }}>Unterschrift Kunde</Text>
            </View>
            <View style={s.signBox}>
              <View style={s.signLine} />
              <Text style={{ fontSize: 9 }}>Unterschrift</Text>
            </View>
          </View>
        </View>

        <View style={s.footerContainer}>
          <View style={s.footerRow}>
            <View style={s.footerLeft}>
              <Text>Die gelieferten Waren bleiben bis zur vollständigen Begleichung des Gegenwertes ausschließliches Eigentum der Firma Plesnicar Solutions.</Text>
            </View>
            <View style={s.footerRight}>
              <Text style={s.bold}>Boris Plesnicar e.U.</Text>
              <Text>Hartriegelstraße 12</Text>
              <Text>3550 Langenlois</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
