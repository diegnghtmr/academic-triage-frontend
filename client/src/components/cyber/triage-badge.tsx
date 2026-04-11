import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

/* ─── Status Badge ───────────────────────────────────────── */

const STATUS_LABELS: Record<string, string> = {
  REGISTERED: "REGISTRADA",
  CLASSIFIED: "CLASIFICADA",
  IN_PROGRESS: "EN TRÁMITE",
  ATTENDED: "ATENDIDA",
  CLOSED: "FINALIZADA",
  CANCELLED: "CANCELADA",
  REJECTED: "RECHAZADA",
};

const statusBadgeVariants = cva(
  "inline-flex items-center font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 transition-colors",
  {
    variants: {
      status: {
        REGISTERED: "ghost-border text-mercury",
        CLASSIFIED: "ghost-border text-foreground",
        IN_PROGRESS: "bg-[#2A2A2A] text-foreground ghost-border",
        ATTENDED: "ghost-border text-foreground",
        CLOSED: "bg-[#1C1B1B] text-mercury ghost-border",
        CANCELLED: "text-mercury opacity-50 ghost-border",
        REJECTED: "text-mercury opacity-50 ghost-border",
      },
    },
    defaultVariants: {
      status: "REGISTERED",
    },
  }
);

export type RequestStatus =
  | "REGISTERED"
  | "CLASSIFIED"
  | "IN_PROGRESS"
  | "ATTENDED"
  | "CLOSED"
  | "CANCELLED"
  | "REJECTED";

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: "sm" | "md" | "lg";
  status: RequestStatus;
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  return (
    <span
      data-testid={`status-badge-${status}`}
      className={cn(statusBadgeVariants({ status }), className)}
      {...props}
    >
      {(status === "IN_PROGRESS" || status === "ATTENDED") && (
        <span className="mr-1.5 text-[8px] opacity-40" aria-hidden="true">▓</span>
      )}
      {STATUS_LABELS[status] || status}
    </span>
  );
}

/* ─── Priority Badge ─────────────────────────────────────── */

const PRIORITY_LABELS: Record<string, string> = {
  HIGH: "ALTA",
  MEDIUM: "ESTÁNDAR",
  LOW: "BAJA",
  CRITICAL: "CRÍTICA",
};

const priorityBadgeVariants = cva(
  "inline-flex items-center font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 transition-colors",
  {
    variants: {
      priority: {
        CRITICAL: "bg-white text-[#0A0A0A] font-bold",
        HIGH: "ghost-border text-foreground font-semibold",
        MEDIUM: "text-mercury ghost-border",
        LOW: "text-mercury opacity-60 ghost-border",
      },
    },
    defaultVariants: {
      priority: "MEDIUM",
    },
  }
);

export type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface PriorityBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  priority: Priority;
}

export function PriorityBadge({ priority, className, ...props }: PriorityBadgeProps) {
  return (
    <span
      data-testid={`priority-badge-${priority}`}
      className={cn(priorityBadgeVariants({ priority }), className)}
      {...props}
    >
      {priority === "CRITICAL" && (
        <span className="mr-1.5 text-[8px]" aria-hidden="true">▓▓</span>
      )}
      {PRIORITY_LABELS[priority] || priority}
    </span>
  );
}

/* ─── Alias: TriageBadge = StatusBadge (backward compat) ── */
export const TriageBadge = StatusBadge;
export interface TriageBadgeProps extends StatusBadgeProps {}
