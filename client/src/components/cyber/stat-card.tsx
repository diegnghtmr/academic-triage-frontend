import * as React from "react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  /** Alias for subtitle */
  sublabel?: string;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
  /** Dither pattern decoration */
  dither?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  subtitle,
  sublabel,
  trend,
  dither,
  className,
}: StatCardProps) {
  const displaySubtitle = subtitle || sublabel;

  return (
    <div
      data-testid="stat-card"
      className={cn(
        "surface-elevated ghost-border p-5 relative group",
        "hover:bg-[#1C1B1B] transition-colors",
        className
      )}
    >
      {/* Subtle dither decoration in top-right */}
      <span
        className="absolute top-2 right-3 font-mono text-[8px] text-mercury opacity-[0.06] select-none pointer-events-none"
        aria-hidden="true"
      >
        {dither || "░▒▓▒░"}
      </span>

      {/* Label */}
      <div
        className="text-[11px] font-mono uppercase tracking-wider text-mercury mb-3"
        data-testid="stat-card-label"
      >
        {label}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-3">
        <span
          className="text-3xl font-mono font-bold text-foreground tracking-tight tabular-nums"
          data-testid="stat-card-value"
        >
          {value}
        </span>

        {/* Trend indicator */}
        {trend && (
          <span
            className={cn(
              "text-xs font-mono",
              trend.direction === "up" && "text-foreground",
              trend.direction === "down" && "text-[#FFB4AB]",
              trend.direction === "neutral" && "text-mercury opacity-60"
            )}
            data-testid="stat-card-trend"
          >
            {trend.direction === "up" && "▲ "}
            {trend.direction === "down" && "▼ "}
            {trend.direction === "neutral" && "─ "}
            {trend.value}
          </span>
        )}
      </div>

      {/* Subtitle */}
      {displaySubtitle && (
        <div
          className="mt-2 text-[11px] font-mono text-mercury opacity-50"
          data-testid="stat-card-subtitle"
        >
          {displaySubtitle}
        </div>
      )}
    </div>
  );
}
