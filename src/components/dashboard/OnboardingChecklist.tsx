"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, ArrowRight, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { OnboardingData, OnboardingItem } from "@/lib/onboarding";

const ITEM_ORDER: Array<keyof OnboardingData["items"]> = [
  "kyc",
  "logo",
  "description",
  "regions",
  "firstLead",
];

export function OnboardingChecklist({ onboarding }: { onboarding: OnboardingData }) {
  if (onboarding.complete) return null;

  const { completedCount, items } = onboarding;
  const percent = Math.round((completedCount / 5) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-green-200 bg-green-50/40">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-green)]/10">
                <Target className="h-5 w-5 text-[var(--brand-green-dark)]" />
              </div>
              <div>
                <p className="text-base font-bold text-foreground">
                  Finalisez votre profil
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Complétez ces étapes pour commencer à recevoir des leads qualifiés.
                </p>
              </div>
            </div>
            <span className="shrink-0 text-sm font-bold text-[var(--brand-green-dark)]">
              {completedCount}/5
            </span>
          </div>

          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[var(--brand-green)] transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>

          <ul className="mt-4 divide-y divide-border/60">
            {ITEM_ORDER.map((key) => (
              <ChecklistRow key={key} item={items[key]} />
            ))}
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ChecklistRow({ item }: { item: OnboardingItem }) {
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {item.done ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--brand-green)]" />
        ) : (
          <Circle className="h-5 w-5 shrink-0 text-muted-foreground/40" />
        )}
        <span
          className={cn(
            "truncate text-sm",
            item.done
              ? "text-muted-foreground line-through"
              : "font-medium text-foreground"
          )}
        >
          {item.label}
        </span>
      </div>
      {item.done ? (
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
          ✓ Fait
        </span>
      ) : (
        <Link
          href={item.href}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[var(--brand-green)] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[var(--brand-green-dark)]"
        >
          Faire
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </li>
  );
}
