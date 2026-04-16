"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, maskText, formatDateShort } from "@/lib/utils";
import {
  MapPin,
  ArrowRight,
  Calendar,
  Users,
  Lock,
  Unlock,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";

export interface LeadData {
  id: string;
  clientName: string;
  fromCity: string;
  toCity: string;
  date: string;
  price: number;
  isTrial: boolean;
  isVerified: boolean;
  competitorCount: number;
  status: "locked" | "unlocked";
  category?: string;
}

interface LeadCardProps {
  lead: LeadData;
  index?: number;
  className?: string;
}

export function LeadCard({ lead, index = 0, className }: LeadCardProps) {
  const maskedName = maskText(lead.clientName, 3);
  const priceFormatted = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(lead.price / 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
    >
      <Link href={`/demandes-de-devis/${lead.id}`}>
        <Card
          className={cn(
            "transition-all hover:shadow-md hover:border-[var(--brand-green)]/30 cursor-pointer",
            className
          )}
        >
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Left side: client info & route */}
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">
                    {maskedName}
                  </p>
                  {lead.isVerified && (
                    <ShieldCheck className="h-4 w-4 text-blue-500" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>{lead.fromCity}</span>
                  <ArrowRight className="h-3 w-3 shrink-0" />
                  <span>{lead.toCity}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>{formatDateShort(lead.date)}</span>
                </div>
              </div>

              {/* Right side: badges & meta */}
              <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                <Badge
                  variant={lead.isTrial ? "warning" : "default"}
                  className="text-[11px]"
                >
                  {lead.isTrial ? "Essai gratuit" : priceFormatted}
                </Badge>

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>{lead.competitorCount} concurrents</span>
                </div>

                <div
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                    lead.status === "unlocked"
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  )}
                >
                  {lead.status === "unlocked" ? (
                    <Unlock className="h-3 w-3" />
                  ) : (
                    <Lock className="h-3 w-3" />
                  )}
                  {lead.status === "unlocked" ? "Débloqué" : "Bloqué"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
