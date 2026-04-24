import { describe, expect, it } from "vitest";
import { computeOnboarding } from "./onboarding";

const EMPTY = {
  company: { kyc_status: null, logo_url: null, description: null },
  unlockedLeads: 0,
  regionCount: 0,
  radiusCount: 0,
};

describe("computeOnboarding", () => {
  it("returns all items false when nothing is filled", () => {
    const out = computeOnboarding(EMPTY);
    expect(out.complete).toBe(false);
    expect(out.completedCount).toBe(0);
    expect(out.items.kyc.done).toBe(false);
    expect(out.items.logo.done).toBe(false);
    expect(out.items.description.done).toBe(false);
    expect(out.items.regions.done).toBe(false);
    expect(out.items.firstLead.done).toBe(false);
  });

  it("marks kyc done only when status is 'approved'", () => {
    for (const status of ["pending", "in_review", "rejected", "", null]) {
      const out = computeOnboarding({ ...EMPTY, company: { ...EMPTY.company, kyc_status: status as string | null } });
      expect(out.items.kyc.done).toBe(false);
    }
    const ok = computeOnboarding({ ...EMPTY, company: { ...EMPTY.company, kyc_status: "approved" } });
    expect(ok.items.kyc.done).toBe(true);
    expect(ok.completedCount).toBe(1);
  });

  it("marks logo done when logo_url is a non-empty string", () => {
    const out = computeOnboarding({ ...EMPTY, company: { ...EMPTY.company, logo_url: "https://example.com/logo.png" } });
    expect(out.items.logo.done).toBe(true);
  });

  it("marks description done only at >= 50 trimmed characters", () => {
    const short = "x".repeat(49);
    const exactly = "x".repeat(50);
    const withWhitespace = "  " + "x".repeat(50) + "  ";
    expect(computeOnboarding({ ...EMPTY, company: { ...EMPTY.company, description: short } }).items.description.done).toBe(false);
    expect(computeOnboarding({ ...EMPTY, company: { ...EMPTY.company, description: exactly } }).items.description.done).toBe(true);
    expect(computeOnboarding({ ...EMPTY, company: { ...EMPTY.company, description: withWhitespace } }).items.description.done).toBe(true);
  });

  it("marks regions done on OR of regionCount and radiusCount", () => {
    expect(computeOnboarding({ ...EMPTY, regionCount: 1 }).items.regions.done).toBe(true);
    expect(computeOnboarding({ ...EMPTY, radiusCount: 1 }).items.regions.done).toBe(true);
    expect(computeOnboarding({ ...EMPTY, regionCount: 3, radiusCount: 2 }).items.regions.done).toBe(true);
    expect(computeOnboarding({ ...EMPTY, regionCount: 0, radiusCount: 0 }).items.regions.done).toBe(false);
  });

  it("marks firstLead done when unlockedLeads > 0", () => {
    expect(computeOnboarding({ ...EMPTY, unlockedLeads: 1 }).items.firstLead.done).toBe(true);
    expect(computeOnboarding({ ...EMPTY, unlockedLeads: 0 }).items.firstLead.done).toBe(false);
  });

  it("reports complete = true only when all 5 items are done", () => {
    const out = computeOnboarding({
      company: { kyc_status: "approved", logo_url: "x", description: "x".repeat(50) },
      unlockedLeads: 1,
      regionCount: 1,
      radiusCount: 0,
    });
    expect(out.complete).toBe(true);
    expect(out.completedCount).toBe(5);
  });

  it("exposes stable hrefs and labels on every item", () => {
    const out = computeOnboarding(EMPTY);
    expect(out.items.kyc.href).toBe("/verification-identite");
    expect(out.items.logo.href).toBe("/profil-entreprise");
    expect(out.items.description.href).toBe("/profil-entreprise");
    expect(out.items.regions.href).toBe("/configurations");
    expect(out.items.firstLead.href).toBe("/demandes-de-devis");
    expect(out.items.kyc.label).toBe("Vérifier mon identité");
    expect(out.items.logo.label).toBe("Ajouter un logo");
    expect(out.items.description.label).toBe("Rédiger une description");
    expect(out.items.regions.label).toBe("Définir mes zones d'intervention");
    expect(out.items.firstLead.label).toBe("Acheter mon premier lead");
  });
});
