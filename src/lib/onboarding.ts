export interface OnboardingItem {
  done: boolean;
  href: string;
  label: string;
}

export interface OnboardingData {
  complete: boolean;
  completedCount: number;
  items: {
    kyc: OnboardingItem;
    logo: OnboardingItem;
    description: OnboardingItem;
    regions: OnboardingItem;
    firstLead: OnboardingItem;
  };
}

export interface OnboardingInput {
  company: {
    kyc_status?: string | null;
    logo_url?: string | null;
    description?: string | null;
  };
  unlockedLeads: number;
  regionCount: number;
  radiusCount: number;
}

const DESCRIPTION_MIN_CHARS = 50;

export function computeOnboarding(input: OnboardingInput): OnboardingData {
  const items: OnboardingData["items"] = {
    kyc: {
      done: input.company.kyc_status === "approved",
      href: "/verification-identite",
      label: "Vérifier mon identité",
    },
    logo: {
      done: typeof input.company.logo_url === "string" && input.company.logo_url.length > 0,
      href: "/profil-entreprise",
      label: "Ajouter un logo",
    },
    description: {
      done: (input.company.description ?? "").trim().length >= DESCRIPTION_MIN_CHARS,
      href: "/profil-entreprise",
      label: "Rédiger une description",
    },
    regions: {
      done: input.regionCount > 0 || input.radiusCount > 0,
      href: "/configurations",
      label: "Définir mes zones d'intervention",
    },
    firstLead: {
      done: input.unlockedLeads > 0,
      href: "/demandes-de-devis",
      label: "Acheter mon premier lead",
    },
  };

  const completedCount = Object.values(items).filter((i) => i.done).length;
  return {
    complete: completedCount === 5,
    completedCount,
    items,
  };
}
