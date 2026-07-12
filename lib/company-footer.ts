/** UID-Nr. (z. B. ATU12345678) — leer lassen, bis vom Finanzamt erteilt. */
export const COMPANY_UID = "";

export const COMPANY_COURT_LOCATION = "3500 Krems a.d. Donau";

/** UID-Zeile für PDF-Footer (Gerichtsstand-Spalte). */
export function companyUidFooterText(): string {
  const uid = COMPANY_UID.trim();
  if (uid) return uid;
  return "in Beantragung beim Finanzamt";
}
