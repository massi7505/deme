export interface SireneResult {
  siret: string;
  siren: string;
  companyName: string;
  raisonSociale: string;
  address: string;
  postalCode: string;
  city: string;
  legalStatus: string;
  legalStatusLabel: string;
  naf: string;
  nafLabel: string;
  employeeCount: string;
  isActive: boolean;
}

export async function verifySiret(
  siret: string
): Promise<SireneResult | null> {
  const cleaned = siret.replace(/\s/g, "");

  if (!/^\d{14}$/.test(cleaned)) {
    return null;
  }

  const response = await fetch(
    `https://api.insee.fr/api-sirene/3.11/siret/${cleaned}`,
    {
      headers: {
        "X-INSEE-Api-Key-Integration": process.env.INSEE_API_TOKEN!,
        Accept: "application/json",
      },
      next: { revalidate: 86400 }, // Cache for 24h
    }
  );

  if (!response.ok) return null;

  const data = await response.json();
  const etab = data.etablissement;

  if (!etab) return null;

  const adresse = etab.adresseEtablissement;
  const unite = etab.uniteLegale;

  const streetParts = [
    adresse.numeroVoieEtablissement,
    adresse.typeVoieEtablissement,
    adresse.libelleVoieEtablissement,
  ].filter(Boolean);

  const denomination = unite.denominationUniteLegale ??
    `${unite.prenomUsuelUniteLegale ?? ""} ${unite.nomUniteLegale ?? ""}`.trim();

  // Raison sociale = dénomination usuelle ou dénomination légale
  const raisonSociale =
    unite.denominationUsuelle1UniteLegale ??
    unite.denominationUniteLegale ??
    denomination;

  const legalStatusCode = unite.categorieJuridiqueUniteLegale ?? "";

  return {
    siret: etab.siret,
    siren: unite.siren ?? etab.siret.slice(0, 9),
    companyName: denomination,
    raisonSociale,
    address: streetParts.join(" "),
    postalCode: adresse.codePostalEtablissement ?? "",
    city: adresse.libelleCommuneEtablissement ?? "",
    legalStatus: legalStatusCode,
    legalStatusLabel: formatLegalStatus(legalStatusCode),
    naf: etab.activitePrincipaleEtablissement ?? "",
    nafLabel: etab.activitePrincipaleEtablissement ?? "",
    employeeCount: unite.trancheEffectifsUniteLegale ?? "",
    isActive:
      etab.etatAdministratifEtablissement === "A" ||
      etab.periodesEtablissement?.[0]?.etatAdministratifEtablissement === "A",
  };
}

export function formatLegalStatus(code: string): string {
  const statuses: Record<string, string> = {
    "1000": "Entrepreneur individuel",
    "5410": "SARL",
    "5499": "SARL unipersonnelle",
    "5498": "EURL",
    "5505": "SA à conseil d'administration",
    "5710": "SAS",
    "5720": "SASU",
    "9220": "Association déclarée",
  };
  return statuses[code] ?? `Statut juridique (${code})`;
}
