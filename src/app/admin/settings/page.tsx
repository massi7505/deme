"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Loader2, Globe, CreditCard, Tag, Mail, Shield, Server, FileCode2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import toast from "react-hot-toast";
import type { Settings } from "@/components/admin/settings/types";
import { DEFAULT_SETTINGS } from "@/components/admin/settings/types";
import GeneralTab from "@/components/admin/settings/GeneralTab";
import PaymentTab from "@/components/admin/settings/PaymentTab";
import PricingTab from "@/components/admin/settings/PricingTab";
import NotificationsTab from "@/components/admin/settings/NotificationsTab";
import SmtpTab from "@/components/admin/settings/SmtpTab";
import SecurityTab from "@/components/admin/settings/SecurityTab";
import EmailTemplatesTab from "@/components/admin/settings/EmailTemplatesTab";

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [adminPassword, setAdminPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setSettings((prev) => ({
          ...prev,
          ...data,
          // Ensure arrays are always arrays even if missing from saved data
          smartPricingDepartments: data.smartPricingDepartments || [],
          smartPricingVolume: data.smartPricingVolume || [],
          smartPricingSeasons: data.smartPricingSeasons || [],
          volumeDiscountTiers: data.volumeDiscountTiers || [],
          promoCodes: data.promoCodes || [],
        }));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const updateField = useCallback(<K extends keyof Settings>(field: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateStringField = useCallback((field: keyof Settings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast.success("Paramètres enregistrés !");
      } else {
        toast.error("Erreur lors de la sauvegarde");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Paramètres</h2>
        <p className="text-sm text-muted-foreground">Configuration de la plateforme</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-6 w-full justify-start gap-1 overflow-x-auto bg-transparent p-0">
          <TabsTrigger
            value="general"
            className="gap-1.5 rounded-lg border border-transparent px-3 py-2 text-sm data-[state=active]:border-gray-200 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Globe className="h-4 w-4" />
            Général
          </TabsTrigger>
          <TabsTrigger
            value="payment"
            className="gap-1.5 rounded-lg border border-transparent px-3 py-2 text-sm data-[state=active]:border-gray-200 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <CreditCard className="h-4 w-4" />
            Paiement
          </TabsTrigger>
          <TabsTrigger
            value="pricing"
            className="gap-1.5 rounded-lg border border-transparent px-3 py-2 text-sm data-[state=active]:border-gray-200 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Tag className="h-4 w-4" />
            Tarification
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="gap-1.5 rounded-lg border border-transparent px-3 py-2 text-sm data-[state=active]:border-gray-200 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Mail className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger
            value="smtp"
            className="gap-1.5 rounded-lg border border-transparent px-3 py-2 text-sm data-[state=active]:border-gray-200 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Server className="h-4 w-4" />
            SMTP
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="gap-1.5 rounded-lg border border-transparent px-3 py-2 text-sm data-[state=active]:border-gray-200 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <FileCode2 className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="gap-1.5 rounded-lg border border-transparent px-3 py-2 text-sm data-[state=active]:border-gray-200 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Shield className="h-4 w-4" />
            Sécurité
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab settings={settings} onUpdate={updateStringField} />
        </TabsContent>

        <TabsContent value="payment">
          <PaymentTab settings={settings} onUpdate={updateStringField} />
        </TabsContent>

        <TabsContent value="pricing">
          <PricingTab settings={settings} onUpdate={updateField} />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsTab settings={settings} onUpdate={updateStringField} />
        </TabsContent>

        <TabsContent value="smtp">
          <SmtpTab settings={settings} onUpdate={updateStringField} />
        </TabsContent>

        <TabsContent value="templates">
          <EmailTemplatesTab settings={settings} onUpdate={updateField} />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab
            settings={settings}
            onUpdate={updateStringField}
            adminPassword={adminPassword}
            onPasswordChange={setAdminPassword}
          />
        </TabsContent>
      </Tabs>

      {/* Global save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-brand-gradient px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-green-500/20 hover:brightness-110 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
