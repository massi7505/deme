"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  MessageCircle,
  Clock,
  Phone,
  FileText,
  Lightbulb,
} from "lucide-react";
import { motion } from "framer-motion";

interface AccountManagerCardProps {
  showTips?: boolean;
  className?: string;
}

export function AccountManagerCard({
  showTips = false,
  className,
}: AccountManagerCardProps) {
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
          <Button className="mt-4 w-full gap-2" size="sm">
            <MessageCircle className="h-4 w-4" />
            Contacter
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
