import * as React from "react";
import { cn } from "@/lib/utils";

/* ─── Pixelated avatar placeholder ───────────────────────── */

function PixelAvatar({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      data-testid="pixel-avatar"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
    >
      {/* Head */}
      <rect x="5" y="2" width="6" height="5" fill="currentColor" opacity="0.4" />
      {/* Body */}
      <rect x="3" y="9" width="10" height="6" fill="currentColor" opacity="0.25" />
      {/* Neck */}
      <rect x="6" y="7" width="4" height="2" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

/* ─── Breadcrumb types ───────────────────────────────────── */

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/* ─── TopBar ─────────────────────────────────────────────── */

export interface TopBarProps {
  breadcrumbs?: BreadcrumbItem[];
  userId?: string;
  userRole?: string;
  userName?: string;
  className?: string;
}

export function TopBar({
  breadcrumbs = [],
  userId,
  userRole,
  userName,
  className,
}: TopBarProps) {
  return (
    <header
      data-testid="top-bar"
      className={cn(
        "h-12 surface-base ghost-border-b",
        "flex items-center justify-between px-5",
        "sticky top-0 z-30",
        className
      )}
    >
      {/* Left: breadcrumbs */}
      <nav
        className="flex items-center gap-0 font-mono text-xs"
        aria-label="Navegación de migas de pan"
        data-testid="top-bar-breadcrumbs"
      >
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <span className="text-mercury opacity-30 mx-2" aria-hidden="true">
                /
              </span>
            )}
            {crumb.href ? (
              <a
                href={crumb.href}
                className="text-mercury hover:text-foreground transition-colors uppercase tracking-wider"
              >
                {crumb.label}
              </a>
            ) : (
              <span className="text-foreground uppercase tracking-wider">
                {crumb.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Right: user info */}
      <div
        className="flex items-center gap-3"
        data-testid="top-bar-user-info"
      >
        {/* User metadata in monospace */}
        <div className="font-mono text-[11px] text-mercury flex items-center gap-2">
          {userId && (
            <>
              <span className="opacity-50">ID:</span>
              <span className="text-foreground">{userId}</span>
            </>
          )}
          {userRole && (
            <>
              <span className="opacity-30 mx-1">|</span>
              <span className="opacity-50">Rol:</span>
              <span className="text-foreground uppercase">{userRole}</span>
            </>
          )}
        </div>

        {/* Pixelated avatar */}
        <div className="ghost-border p-0.5">
          <PixelAvatar className="text-mercury" size={24} />
        </div>
      </div>
    </header>
  );
}
