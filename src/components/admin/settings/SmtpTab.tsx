"use client";

import { useState } from "react";
import { Server, CheckCircle2, XCircle, Loader2, Send } from "lucide-react";
import toast from "react-hot-toast";
import type { Settings } from "./types";

interface Props {
  settings: Settings;
  onUpdate: (field: keyof Settings, value: string) => void;
}

const inputCls = "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]";

export default function SmtpTab({ settings, onUpdate }: Props) {
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [testEmail, setTestEmail] = useState("");

  const isResend = settings.smtpProvider === "resend";

  async function handleTestEmail() {
    if (!testEmail) {
      toast.error("Entrez une adresse email de test");
      return;
    }
    setTestStatus("sending");
    try {
      const res = await fetch("/api/admin/test-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testEmail,
          provider: settings.smtpProvider,
          // Send current config for test
          smtpHost: settings.smtpHost,
          smtpPort: settings.smtpPort,
          smtpUser: settings.smtpUser,
          smtpPassword: settings.smtpPassword,
          smtpEncryption: settings.smtpEncryption,
          smtpFromName: settings.smtpFromName,
          smtpFromEmail: settings.smtpFromEmail,
          resendApiKey: settings.resendApiKey,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }
      setTestStatus("success");
      toast.success("Email de test envoyé !");
    } catch (err) {
      setTestStatus("error");
      toast.error(err instanceof Error ? err.message : "Erreur d'envoi");
    }
  }

  return (
    <div className="space-y-6">
      {/* Provider selector */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <Server className="h-4 w-4 text-[var(--brand-green)]" /> Fournisseur d&apos;email
          </h3>
        </div>
        <div className="p-5">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onUpdate("smtpProvider", "resend")}
              className={`flex-1 rounded-lg border px-4 py-3 text-left transition-all ${
                isResend
                  ? "border-green-300 bg-green-50 ring-1 ring-green-200"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              <p className="text-sm font-semibold">Resend</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Service cloud, simple à configurer
              </p>
            </button>
            <button
              type="button"
              onClick={() => onUpdate("smtpProvider", "smtp")}
              className={`flex-1 rounded-lg border px-4 py-3 text-left transition-all ${
                !isResend
                  ? "border-green-300 bg-green-50 ring-1 ring-green-200"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              <p className="text-sm font-semibold">SMTP personnalisé</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Votre propre serveur SMTP
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Resend config */}
      {isResend && (
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold">
              <Server className="h-4 w-4 text-[var(--brand-green)]" /> Configuration Resend
            </h3>
          </div>
          <div className="space-y-4 p-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Clé API Resend <span className="text-xs text-muted-foreground">(commence par re_)</span>
              </label>
              <input
                type="password"
                value={settings.resendApiKey}
                onChange={(e) => onUpdate("resendApiKey", e.target.value)}
                placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
                className={`${inputCls} font-mono`}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Nom expéditeur</label>
                <input
                  value={settings.smtpFromName}
                  onChange={(e) => onUpdate("smtpFromName", e.target.value)}
                  placeholder="Demenagement24"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Email expéditeur</label>
                <input
                  type="email"
                  value={settings.smtpFromEmail}
                  onChange={(e) => onUpdate("smtpFromEmail", e.target.value)}
                  placeholder="noreply@demenagement24.com"
                  className={inputCls}
                />
              </div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
              Créez votre clé API sur{" "}
              <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="font-medium underline">
                resend.com
              </a>
              . Vérifiez votre domaine d&apos;envoi dans leur dashboard.
            </div>
          </div>
        </div>
      )}

      {/* SMTP config */}
      {!isResend && (
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold">
              <Server className="h-4 w-4 text-[var(--brand-green)]" /> Configuration SMTP
            </h3>
          </div>
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Serveur SMTP (host)</label>
                <input
                  value={settings.smtpHost}
                  onChange={(e) => onUpdate("smtpHost", e.target.value)}
                  placeholder="smtp.gmail.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Port</label>
                <input
                  value={settings.smtpPort}
                  onChange={(e) => onUpdate("smtpPort", e.target.value)}
                  placeholder="587"
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Chiffrement</label>
              <div className="flex gap-3">
                {(["tls", "ssl", "none"] as const).map((enc) => (
                  <button
                    key={enc}
                    type="button"
                    onClick={() => onUpdate("smtpEncryption", enc)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                      settings.smtpEncryption === enc
                        ? "border-green-300 bg-green-50 text-green-700"
                        : "bg-white text-muted-foreground hover:bg-gray-50"
                    }`}
                  >
                    {enc === "tls" ? "STARTTLS" : enc === "ssl" ? "SSL/TLS" : "Aucun"}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {settings.smtpPort === "587" ? "Port 587 utilise typiquement STARTTLS" :
                 settings.smtpPort === "465" ? "Port 465 utilise typiquement SSL/TLS" :
                 "Choisissez le chiffrement adapté à votre serveur"}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Utilisateur / Login</label>
                <input
                  value={settings.smtpUser}
                  onChange={(e) => onUpdate("smtpUser", e.target.value)}
                  placeholder="user@example.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Mot de passe</label>
                <input
                  type="password"
                  value={settings.smtpPassword}
                  onChange={(e) => onUpdate("smtpPassword", e.target.value)}
                  placeholder="••••••••"
                  className={inputCls}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Nom expéditeur</label>
                <input
                  value={settings.smtpFromName}
                  onChange={(e) => onUpdate("smtpFromName", e.target.value)}
                  placeholder="Demenagement24"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Email expéditeur</label>
                <input
                  type="email"
                  value={settings.smtpFromEmail}
                  onChange={(e) => onUpdate("smtpFromEmail", e.target.value)}
                  placeholder="noreply@demenagement24.com"
                  className={inputCls}
                />
              </div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
              Pour Gmail, utilisez un mot de passe d&apos;application (pas votre mot de passe Gmail).
              Pour OVH : smtp.mail.ovh.net / port 587 / STARTTLS.
              Pour Ionos : smtp.ionos.fr / port 587 / STARTTLS.
            </div>
          </div>
        </div>
      )}

      {/* Test email */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <Send className="h-4 w-4 text-[var(--brand-green)]" /> Tester l&apos;envoi
          </h3>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Adresse email de test</label>
            <div className="flex gap-3">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="votre-email@example.com"
                className={`${inputCls} flex-1`}
              />
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={testStatus === "sending"}
                className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                {testStatus === "sending" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : testStatus === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : testStatus === "error" ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Envoyer un test
              </button>
            </div>
          </div>
          {testStatus === "success" && (
            <p className="text-sm font-medium text-green-600">
              Email envoyé avec succès ! Vérifiez votre boîte de réception.
            </p>
          )}
          {testStatus === "error" && (
            <p className="text-sm font-medium text-red-600">
              L&apos;envoi a échoué. Vérifiez votre configuration.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
