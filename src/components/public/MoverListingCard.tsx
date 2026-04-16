"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Star, CheckCircle2, ArrowRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MoverCardData {
  slug: string;
  name: string;
  city: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  initials: string;
  color: string;
  services?: string[];
}

interface MoverListingCardProps {
  mover: MoverCardData;
  index?: number;
}

export function MoverListingCard({ mover, index = 0 }: MoverListingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.08,
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      }}
    >
      <Link
        href={`/entreprises-demenagement/${mover.slug}`}
        className={cn(
          "group flex flex-col rounded-2xl border bg-white p-6 shadow-sm",
          "transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-green-200"
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-4">
          {/* Logo placeholder */}
          <div
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white",
              mover.color
            )}
          >
            {mover.initials}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-display text-base font-bold text-gray-900">
                {mover.name}
              </h3>
              {mover.verified && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
              )}
            </div>
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {mover.city}
            </div>
          </div>
        </div>

        {/* Rating */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg bg-green-50 px-2.5 py-1">
            <Star className="h-4 w-4 fill-green-500 text-green-500" />
            <span className="text-sm font-bold text-green-700">
              {mover.rating.toFixed(1)}
            </span>
            <span className="text-xs text-green-600">/10</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {mover.reviewCount} avis
          </span>
        </div>

        {/* Services */}
        {mover.services && mover.services.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {mover.services.slice(0, 3).map((service) => (
              <span
                key={service}
                className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600"
              >
                {service}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-[var(--brand-green)] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          Voir le profil
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </Link>
    </motion.div>
  );
}
