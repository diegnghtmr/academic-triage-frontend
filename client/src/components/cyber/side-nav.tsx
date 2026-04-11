import * as React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { TempleIcon } from "./ascii-temple";

/* ─── Pixelated icon components (no standard icon library) ─── */

function GridIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="1" y="1" width="6" height="6" stroke="currentColor" strokeWidth="1" />
      <rect x="9" y="1" width="6" height="6" stroke="currentColor" strokeWidth="1" />
      <rect x="1" y="9" width="6" height="6" stroke="currentColor" strokeWidth="1" />
      <rect x="9" y="9" width="6" height="6" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="1" y="2" width="2" height="2" fill="currentColor" />
      <rect x="5" y="2" width="10" height="2" fill="currentColor" opacity="0.6" />
      <rect x="1" y="7" width="2" height="2" fill="currentColor" />
      <rect x="5" y="7" width="10" height="2" fill="currentColor" opacity="0.6" />
      <rect x="1" y="12" width="2" height="2" fill="currentColor" />
      <rect x="5" y="12" width="10" height="2" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="5" y="2" width="6" height="4" stroke="currentColor" strokeWidth="1" />
      <rect x="3" y="9" width="10" height="5" stroke="currentColor" strokeWidth="1" />
      <line x1="8" y1="6" x2="8" y2="9" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function CatalogIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="2" y="1" width="12" height="14" stroke="currentColor" strokeWidth="1" />
      <line x1="5" y1="4" x2="11" y2="4" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="5" y1="7" x2="11" y2="7" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="5" y1="10" x2="9" y2="10" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="5" y="5" width="6" height="6" stroke="currentColor" strokeWidth="1" />
      <rect x="7" y="1" width="2" height="3" fill="currentColor" opacity="0.5" />
      <rect x="7" y="12" width="2" height="3" fill="currentColor" opacity="0.5" />
      <rect x="1" y="7" width="3" height="2" fill="currentColor" opacity="0.5" />
      <rect x="12" y="7" width="3" height="2" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

function ExitIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="1" y="1" width="8" height="14" stroke="currentColor" strokeWidth="1" />
      <line x1="9" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1" />
      <polyline points="12,5 15,8 12,11" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  );
}

/* ─── Navigation items ───────────────────────────────────── */

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: GridIcon },
  { label: "Solicitudes", href: "/solicitudes", icon: ListIcon },
  { label: "Usuarios", href: "/usuarios", icon: UsersIcon },
  { label: "Catálogos", href: "/catalogos", icon: CatalogIcon },
  { label: "Configuración", href: "/configuracion", icon: GearIcon },
];

/* ─── SideNav component ──────────────────────────────────── */

export interface SideNavProps {
  items?: NavItem[];
  onLogout?: () => void;
  className?: string;
}

export function SideNav({
  items = DEFAULT_NAV_ITEMS,
  onLogout,
  className,
}: SideNavProps) {
  const [location] = useLocation();

  return (
    <nav
      data-testid="side-nav"
      className={cn(
        "fixed left-0 top-0 bottom-0 w-56",
        "surface-base ghost-border-r",
        "flex flex-col",
        "z-40",
        className
      )}
    >
      {/* ── Header ── */}
      <div className="px-4 pt-5 pb-4 ghost-border-b">
        <div className="flex items-center gap-3 mb-2">
          <TempleIcon size={20} className="text-mercury opacity-60 shrink-0" />
          <div>
            <h1
              className="text-xs font-mono font-bold text-foreground uppercase tracking-wider leading-none"
              data-testid="side-nav-title"
            >
              TRIAGE ACADÉMICO
            </h1>
            <p className="text-[9px] font-mono text-mercury opacity-50 uppercase tracking-widest mt-1">
              EL PANTEÓN DIGITAL
            </p>
          </div>
        </div>

        {/* Decorative dither line */}
        <div
          className="font-mono text-[7px] text-mercury opacity-10 select-none overflow-hidden whitespace-nowrap mt-2"
          aria-hidden="true"
        >
          ░▒▓▒░▒▓▒░▒▓▒░▒▓▒░▒▓▒░▒▓▒░
        </div>
      </div>

      {/* ── Navigation items ── */}
      <div className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? location === "/" || location === ""
              : location.startsWith(item.href);

          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <a
                data-testid={`side-nav-item-${item.href.replace(/\//g, "") || "home"}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 transition-colors group",
                  "font-mono text-xs uppercase tracking-wider",
                  isActive
                    ? "bg-[#3A3939] text-foreground"
                    : "text-mercury hover:bg-[#1C1B1B] hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "shrink-0 transition-colors",
                    isActive ? "text-foreground" : "text-mercury opacity-60 group-hover:opacity-100"
                  )}
                />
                <span>{item.label}</span>

                {/* Active indicator */}
                {isActive && (
                  <span
                    className="ml-auto text-[6px] text-foreground opacity-60"
                    aria-hidden="true"
                  >
                    ■
                  </span>
                )}
              </a>
            </Link>
          );
        })}
      </div>

      {/* ── Footer: Logout ── */}
      <div className="px-2 pb-4 pt-2 ghost-border-t">
        <button
          data-testid="side-nav-logout"
          onClick={onLogout}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 w-full transition-colors",
            "font-mono text-xs uppercase tracking-wider",
            "text-mercury hover:bg-[#1C1B1B] hover:text-[#FFB4AB]"
          )}
        >
          <ExitIcon className="shrink-0 text-mercury opacity-60" />
          <span>Salir</span>
        </button>

        {/* Version tag */}
        <div className="px-3 mt-2 text-[8px] font-mono text-mercury opacity-20">
          v1.0.0 | SISTEMA TRIAGE
        </div>
      </div>
    </nav>
  );
}
