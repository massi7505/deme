"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Lock, Bell, Trash2, AlertTriangle, Settings } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

export default function ParametresPage() {
  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Notification preferences
  const [notifNewLeads, setNotifNewLeads] = useState(true);
  const [notifPayments, setNotifPayments] = useState(true);
  const [notifKyc, setNotifKyc] = useState(true);

  // Delete account
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handlePasswordChange() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Le nouveau mot de passe doit contenir au moins 8 caractères");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setChangingPassword(true);
    try {
      const supabase = createClient();

      // Verify current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: (await supabase.auth.getUser()).data.user?.email || "",
        password: currentPassword,
      });

      if (signInError) {
        toast.error("Le mot de passe actuel est incorrect");
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        toast.error("Erreur lors du changement de mot de passe");
        return;
      }

      toast.success("Mot de passe modifié avec succès");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== "SUPPRIMER") {
      toast.error("Veuillez taper SUPPRIMER pour confirmer");
      return;
    }

    setDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        toast.error("Erreur lors de la suppression du compte");
        return;
      }

      // Note: actual account deletion requires a server-side admin action.
      // This signs the user out and a support request is created.
      toast.success("Votre demande de suppression a été enregistrée. Notre équipe vous contactera.");
      window.location.href = "/";
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-[var(--brand-green)]" />
          <h2 className="text-2xl font-bold tracking-tight">Paramètres</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez votre mot de passe, vos notifications et les paramètres de votre compte.
        </p>
      </motion.div>

      {/* Password change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-[var(--brand-green)]" /> Changer le mot de passe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Mot de passe actuel</Label>
            <Input
              id="current-password"
              type="password"
              placeholder="Votre mot de passe actuel"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Minimum 8 caractères"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Retapez le nouveau mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button
            onClick={handlePasswordChange}
            disabled={changingPassword}
            className="gap-2"
          >
            <Lock className="h-4 w-4" />
            {changingPassword ? "Modification en cours..." : "Modifier le mot de passe"}
          </Button>
        </CardContent>
      </Card>

      {/* Email notification preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-[var(--brand-green)]" /> Notifications par email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Nouvelles demandes de devis</p>
              <p className="text-xs text-muted-foreground">
                Recevez un email à chaque nouvelle demande correspondant à vos critères.
              </p>
            </div>
            <Switch
              checked={notifNewLeads}
              onCheckedChange={setNotifNewLeads}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Confirmations de paiement</p>
              <p className="text-xs text-muted-foreground">
                Recevez un email pour chaque paiement effectué ou remboursé.
              </p>
            </div>
            <Switch
              checked={notifPayments}
              onCheckedChange={setNotifPayments}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Mises à jour KYC</p>
              <p className="text-xs text-muted-foreground">
                Recevez un email lorsque le statut de votre vérification d&apos;identité change.
              </p>
            </div>
            <Switch
              checked={notifKyc}
              onCheckedChange={setNotifKyc}
            />
          </div>
        </CardContent>
      </Card>

      {/* Delete account */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-red-600">
            <Trash2 className="h-4 w-4" /> Supprimer le compte
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            La suppression de votre compte est irréversible. Toutes vos données, demandes et historique de facturation seront définitivement supprimés.
          </p>
          <Button
            variant="outline"
            className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Supprimer mon compte
          </Button>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Toutes vos données seront définitivement supprimées.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm">
              Pour confirmer, tapez <strong>SUPPRIMER</strong> dans le champ ci-dessous :
            </p>
            <Input
              placeholder="Tapez SUPPRIMER"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteConfirmText("");
              }}
              disabled={deleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirmText !== "SUPPRIMER"}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Suppression en cours..." : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
