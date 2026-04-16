"use client";

import { useState } from "react";
import { CreditCard, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import type { Settings } from "./types";

interface Props {
  settings: Settings;
  onUpdate: (field: keyof Settings, value: string) => void;
}

export default function PaymentTab({ settings, onUpdate }: Props) {
  const [mollieStatus, setMollieStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");

  async function testMollieKey() {
    const key = settings.mollieMode === "test" ? settings.mollieTestKey : settings.mollieLiveKey;
    if (!key) {
      toast.error("Entrez une clé API Mollie");
      return;
    }
    setMollieStatus("checking");
    try {
      const res = await fetch("/api/admin/test-mollie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key }),
      });
      const data = await res.json();
      setMollieStatus(data.valid ? "valid" : "invalid");
      if (data.valid) toast.success(data.message || "Clé Mollie valide !");
      else toast.error(data.error || "Clé Mollie invalide");
    } catch {
      setMollieStatus("invalid");
      toast.error("Erreur de vérification");
    }
  }

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="border-b px-5 py-4">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold">
          <CreditCard className="h-4 w-4 text-[var(--brand-green)]" /> Passerelle de paiement Mollie
        </h3>
      </div>
      <div className="space-y-4 p-5">
        {/* Mode selector */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Mode</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onUpdate("mollieMode", "test")}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                settings.mollieMode === "test"
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : "bg-white text-muted-foreground hover:bg-gray-50"
              }`}
            >
              Mode Test
            </button>
            <button
              type="button"
              onClick={() => onUpdate("mollieMode", "live")}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                settings.mollieMode === "live"
                  ? "border-green-300 bg-green-50 text-green-700"
                  : "bg-white text-muted-foreground hover:bg-gray-50"
              }`}
            >
              Mode Live
            </button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {settings.mollieMode === "test"
              ? "Mode test : aucun paiement réel ne sera effectué"
              : "Mode live : les paiements seront réels"}
          </p>
        </div>

        {/* Profile ID */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Profil ID <span className="text-xs text-muted-foreground">(commence par pfl_)</span>
          </label>
          <input
            value={settings.mollieProfileId}
            onChange={(e) => onUpdate("mollieProfileId", e.target.value)}
            placeholder="pfl_xxxxxxxx"
            className="w-full rounded-lg border px-3 py-2 font-mono text-sm outline-none focus:border-[var(--brand-green)]"
          />
        </div>

        {/* Test key */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Clé API Test <span className="text-xs text-muted-foreground">(commence par test_)</span>
          </label>
          <input
            type="password"
            value={settings.mollieTestKey}
            onChange={(e) => onUpdate("mollieTestKey", e.target.value)}
            placeholder="test_xxxxxxxxxxxxxxxxxxxxxxxx"
            className="w-full rounded-lg border px-3 py-2 font-mono text-sm outline-none focus:border-[var(--brand-green)]"
          />
        </div>

        {/* Live key */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Clé API Live <span className="text-xs text-muted-foreground">(commence par live_)</span>
          </label>
          <input
            type="password"
            value={settings.mollieLiveKey}
            onChange={(e) => onUpdate("mollieLiveKey", e.target.value)}
            placeholder="live_xxxxxxxxxxxxxxxxxxxxxxxx"
            className="w-full rounded-lg border px-3 py-2 font-mono text-sm outline-none focus:border-[var(--brand-green)]"
          />
        </div>

        {/* Test button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={testMollieKey}
            disabled={mollieStatus === "checking"}
            className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {mollieStatus === "checking" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mollieStatus === "valid" ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : mollieStatus === "invalid" ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            Tester la connexion
          </button>
          {mollieStatus === "valid" && (
            <span className="text-sm font-medium text-green-600">Connexion réussie</span>
          )}
          {mollieStatus === "invalid" && (
            <span className="text-sm font-medium text-red-600">Connexion échouée</span>
          )}
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          En mode test, utilisez les cartes de test Mollie. Aucun montant réel ne sera débité.
          Passez en mode live uniquement lorsque vous êtes prêt à accepter de vrais paiements.
        </div>
      </div>
    </div>
  );
}
