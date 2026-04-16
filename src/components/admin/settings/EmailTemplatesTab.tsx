"use client";

import { useState, useMemo } from "react";
import { Mail, Eye, RotateCcw, ChevronDown, ChevronRight, Code2 } from "lucide-react";
import type { Settings } from "./types";
import { EMAIL_TEMPLATE_DEFS, DEFAULT_EMAIL_TEMPLATES } from "./types";

interface Props {
  settings: Settings;
  onUpdate: <K extends keyof Settings>(field: K, value: Settings[K]) => void;
}

const CATEGORIES = ["Déménageur", "Client", "Admin"];

export default function EmailTemplatesTab({ settings, onUpdate }: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(CATEGORIES));

  const templates = settings.emailTemplates || {};

  function getTemplate(key: string) {
    return templates[key] || DEFAULT_EMAIL_TEMPLATES[key] || { subject: "", body: "" };
  }

  function isCustomized(key: string) {
    return !!templates[key];
  }

  function updateTemplate(key: string, field: "subject" | "body", value: string) {
    const current = getTemplate(key);
    const updated = { ...current, [field]: value };
    onUpdate("emailTemplates", { ...templates, [key]: updated });
  }

  function resetTemplate(key: string) {
    const next = { ...templates };
    delete next[key];
    onUpdate("emailTemplates", next);
  }

  function toggleCat(cat: string) {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  const selected = selectedKey ? getTemplate(selectedKey) : null;
  const selectedDef = EMAIL_TEMPLATE_DEFS.find((d) => d.key === selectedKey);

  const grouped = useMemo(() => {
    const map: Record<string, typeof EMAIL_TEMPLATE_DEFS> = {};
    for (const cat of CATEGORIES) map[cat] = [];
    for (const def of EMAIL_TEMPLATE_DEFS) {
      map[def.category]?.push(def);
    }
    return map;
  }, []);

  function handlePreview() {
    if (!selected) return;
    // Replace variables with sample values for preview
    let html = selected.body;
    const sampleVars: Record<string, string> = {
      companyName: "Transport Express SARL",
      baseUrl: "https://demenagement24.fr",
      fromCity: "Paris",
      toCity: "Lyon",
      leadId: "abc123",
      clientName: "Jean Dupont",
      prospectId: "46217132FR211203",
      amount: "12,00\u00a0\u20ac",
      invoiceNumber: "FA-2026-0001",
      description: "Déverrouillage demande de devis",
      dateTime: "16/04/2026 17:14",
      reason: "Numéro invalide",
      claimRef: "A1B2C3D4",
      statusLabel: "Remboursée",
      statusColor: "#2563eb",
      statusBg: "#eff6ff",
    };
    for (const [k, v] of Object.entries(sampleVars)) {
      html = html.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v);
    }
    setPreviewHtml(html);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <Mail className="h-4 w-4 text-[var(--brand-green)]" /> Templates email
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Modifiez le sujet et le contenu HTML de chaque email. Utilisez {"{{variable}}"} pour les données dynamiques.
          </p>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] divide-x">
          {/* Sidebar — template list */}
          <div className="divide-y">
            {CATEGORIES.map((cat) => (
              <div key={cat}>
                <button
                  onClick={() => toggleCat(cat)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-gray-50"
                >
                  {cat}
                  {expandedCats.has(cat) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
                {expandedCats.has(cat) && (
                  <div>
                    {grouped[cat]?.map((def) => (
                      <button
                        key={def.key}
                        onClick={() => { setSelectedKey(def.key); setPreviewHtml(null); }}
                        className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors ${
                          selectedKey === def.key
                            ? "bg-green-50 font-medium text-green-700"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{def.label}</span>
                        {isCustomized(def.key) && (
                          <span className="ml-auto shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                            modifié
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Editor */}
          <div className="min-h-[500px] p-5">
            {!selected || !selectedDef ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Code2 className="h-10 w-10 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">Sélectionnez un template à modifier</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Template name + actions */}
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold">{selectedDef.label}</h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => resetTemplate(selectedKey!)}
                      className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                      title="Revenir au template par défaut"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Défaut
                    </button>
                    <button
                      onClick={handlePreview}
                      className="flex items-center gap-1.5 rounded-lg bg-brand-gradient px-3 py-1.5 text-xs font-bold text-white hover:brightness-110"
                    >
                      <Eye className="h-3.5 w-3.5" /> Aperçu
                    </button>
                  </div>
                </div>

                {/* Variables */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Variables disponibles</label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDef.variables.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => navigator.clipboard.writeText(`{{${v}}}`)}
                        className="rounded-md border bg-gray-50 px-2 py-0.5 font-mono text-[11px] text-gray-700 hover:bg-gray-100"
                        title={`Cliquez pour copier {{${v}}}`}
                      >
                        {`{{${v}}}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Sujet</label>
                  <input
                    value={selected.subject}
                    onChange={(e) => updateTemplate(selectedKey!, "subject", e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm font-mono outline-none focus:border-[var(--brand-green)]"
                  />
                </div>

                {/* Body (HTML) */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Contenu HTML</label>
                  <textarea
                    value={selected.body}
                    onChange={(e) => updateTemplate(selectedKey!, "body", e.target.value)}
                    rows={16}
                    className="w-full rounded-lg border px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:border-[var(--brand-green)] resize-y"
                    spellCheck={false}
                  />
                </div>

                {/* Preview */}
                {previewHtml && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Aperçu</label>
                      <button onClick={() => setPreviewHtml(null)} className="text-xs text-muted-foreground hover:text-foreground">
                        Fermer
                      </button>
                    </div>
                    <div className="rounded-lg border bg-white p-1">
                      <iframe
                        srcDoc={previewHtml}
                        className="h-[400px] w-full rounded border-0"
                        title="Aperçu email"
                        sandbox=""
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
