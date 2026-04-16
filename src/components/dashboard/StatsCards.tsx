"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";

export interface StatItem {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  change: number;
  icon: LucideIcon;
  color: string;
}

interface StatsCardsProps {
  stats: StatItem[];
  className?: string;
}

function AnimatedCounter({
  target,
  suffix = "",
  prefix = "",
}: {
  target: number;
  suffix?: string;
  prefix?: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(current + increment, target);
      setCount(Math.round(current * 10) / 10);

      if (step >= steps) {
        setCount(target);
        clearInterval(timer);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [target]);

  const display = Number.isInteger(target)
    ? count.toFixed(0)
    : count.toFixed(1);

  return (
    <span>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

export function StatsCards({ stats, className }: StatsCardsProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 lg:grid-cols-4",
        className
      )}
    >
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        const isPositive = stat.change >= 0;

        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
          >
            <Card className="relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      stat.color
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                      isPositive
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    )}
                  >
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {isPositive ? "+" : ""}
                    {stat.change}%
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold tracking-tight text-foreground">
                    <AnimatedCounter
                      target={stat.value}
                      suffix={stat.suffix}
                      prefix={stat.prefix}
                    />
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
