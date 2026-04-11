import * as React from "react";
import { cn } from "@/lib/utils";

export interface AsciiTempleProps {
  /** "sm" for sidebar, "md" for medium contexts, "lg" for login/splash */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const TEMPLE_SMALL = [
  "       ▲       ",
  "      ╱ ╲      ",
  "     ╱   ╲     ",
  "    ╱─────╲    ",
  "    │ │ │ │    ",
  "    │ │ │ │    ",
  "    ╞═╪═╪═╡    ",
  "   ▀▀▀▀▀▀▀▀▀  ",
].join("\n");

const TEMPLE_MEDIUM = [
  "          ▲          ",
  "         ╱ ╲         ",
  "        ╱   ╲        ",
  "       ╱ ◆◆◆ ╲       ",
  "      ╱───────╲      ",
  "      │ ║ ║ ║ │      ",
  "      │ ║ ║ ║ │      ",
  "      │ ║ ║ ║ │      ",
  "      ├─╨─╨─╨─┤      ",
  "      │░░░░░░░│      ",
  "      ╞═══════╡      ",
  "     ▀▀▀▀▀▀▀▀▀▀▀    ",
].join("\n");

const TEMPLE_LARGE = [
  "              ▲              ",
  "             ╱ ╲             ",
  "            ╱   ╲            ",
  "           ╱     ╲           ",
  "          ╱  ◆◆◆  ╲          ",
  "         ╱─────────╲         ",
  "        ┌───────────┐        ",
  "        │ ║  ║  ║  ║│        ",
  "        │ ║  ║  ║  ║│        ",
  "        │ ║  ║  ║  ║│        ",
  "        │ ║  ║  ║  ║│        ",
  "        │ ║  ║  ║  ║│        ",
  "        ├─╨──╨──╨──╨┤        ",
  "        │░░░░░░░░░░░│        ",
  "        ╞═══════════╡        ",
  "       ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀      ",
].join("\n");

export function AsciiTemple({ size = "sm", className }: AsciiTempleProps) {
  const art = size === "lg" ? TEMPLE_LARGE : size === "md" ? TEMPLE_MEDIUM : TEMPLE_SMALL;

  return (
    <pre
      data-testid="ascii-temple"
      className={cn(
        "font-mono select-none leading-none",
        size === "sm" && "text-[8px] text-mercury opacity-60",
        size === "md" && "text-[10px] text-mercury opacity-70",
        size === "lg" && "text-[11px] text-mercury opacity-80",
        className
      )}
      aria-label="Panteón Digital - Logo decorativo de templo griego"
      role="img"
    >
      {art}
    </pre>
  );
}

/* ─── SVG Temple variant (for crisp rendering at any size) ─── */

export function TempleIcon({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      data-testid="temple-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Panteón"
    >
      {/* Pediment (triangle) */}
      <path
        d="M12 2L4 9H20L12 2Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      {/* Architrave */}
      <rect x="4" y="9" width="16" height="1.5" fill="currentColor" opacity="0.3" />
      {/* Columns */}
      <rect x="5.5" y="10.5" width="1" height="9" fill="currentColor" opacity="0.6" />
      <rect x="9" y="10.5" width="1" height="9" fill="currentColor" opacity="0.6" />
      <rect x="14" y="10.5" width="1" height="9" fill="currentColor" opacity="0.6" />
      <rect x="17.5" y="10.5" width="1" height="9" fill="currentColor" opacity="0.6" />
      {/* Stylobate (base) */}
      <rect x="3" y="19.5" width="18" height="1" fill="currentColor" opacity="0.4" />
      <rect x="2" y="20.5" width="20" height="1.5" fill="currentColor" opacity="0.2" />
    </svg>
  );
}
