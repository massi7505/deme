"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  MessageCircle,
  Clock,
  Phone,
  FileText,
  Lightbulb,
  Send,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

interface AccountManagerCardProps {
  showTips?: boolean;
  className?: string;
}

const SUBJECT_OPTIONS = [
  "Question commerciale",
  "Question technique",
  "Question facturation",
  "Autre",
] as const;

export function AccountManagerCard({
  showTips = false,
  className,
}: AccountManagerCardProps) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState<string>(SUBJECT_OPTIONS[0]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 10) {
      toast.error("Votre message doit faire au moins 10 caractères");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/dashboard/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message: message.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body?.error || "Erreur lors de l'envoi");
        return;
      }
      toast.success("Message envoyé — notre équipe vous répond sous 24h");
      setOpen(false);
      setMessage("");
      setSubject(SUBJECT_OPTIONS[0]);
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className={cn("space-y-4", className)}
    >
      {showTips && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Besoin d&apos;aide ?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-green)]" />
                <span>
                  Contactez le client dans les <strong>8 heures</strong> pour
                  maximiser vos chances.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-green)]" />
                <span>
                  Privilegiez un <strong>appel telephonique</strong> plutot
                  qu&apos;un email.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-green)]" />
                <span>
                  Envoyez un devis <strong>clair et detaille</strong> avec vos
                  tarifs.
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Votre responsable de compte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-green-100 text-[var(--brand-green)] font-semibold">
                MD
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Marie Dupont
              </p>
              <p className="text-xs text-muted-foreground">
                Responsable commercial
              </p>
            </div>
          </div>
          <Button
            type="button"
            className="mt-4 w-full gap-2"
            size="sm"
            onClick={() => setOpen(true)}
          >
            <MessageCircle className="h-4 w-4" />
            Contacter
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Contacter votre responsable de compte</DialogTitle>
            <DialogDescription>
              Décrivez votre demande, nous vous répondons sous 24 h ouvrées
              directement par email.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Sujet</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger id="subject">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECT_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Décrivez votre demande en quelques lignes..."
                rows={6}
                maxLength={5000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
              <p className="text-right text-xs text-muted-foreground">
                {message.length}/5000
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={submitting || message.trim().length < 10}
                className="gap-2 bg-brand-gradient text-white hover:brightness-110"
              >
                {submitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {submitting ? "Envoi..." : "Envoyer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
