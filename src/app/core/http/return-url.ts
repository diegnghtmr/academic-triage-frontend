/**
 * Safe return-URL parsing — guards against open-redirect attacks on the login
 * flow. All unknown or untrusted inputs default to `/app`.
 *
 * Reject criteria (in evaluation order):
 *   1. null / empty string → fallback
 *   2. Raw backslash (`\`) or URL-encoded backslash (`%5C`, case-insensitive) → fallback
 *   3. `new URL(raw, origin)` construction fails → fallback
 *   4. Parsed origin ≠ app origin → fallback  (blocks `//evil.com`, `https://evil.com`, etc.)
 *   5. Pathname not on the internal-path allowlist → fallback
 *   6. Otherwise → return pathname + search + hash
 *
 * Adding a new top-level route to the app? Add its prefix to `INTERNAL_PATH_PREFIXES`.
 */

const INTERNAL_PATH_PREFIXES = ['/app', '/auth/login'] as const;

export interface ParseSafeReturnUrlOptions {
  /** Defaults to `window.location.origin` (or `'http://localhost'` in non-browser envs). */
  origin?: string;
  /** Returned when the raw URL is rejected. Defaults to `/app`. */
  fallback?: string;
}

function resolveOrigin(opt?: string): string {
  if (opt !== undefined) return opt;
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost';
}

function isInternalPath(pathname: string): boolean {
  return INTERNAL_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Parses `raw` and returns a safe same-origin path string.
 * Never throws; always returns a non-empty string.
 */
export function parseSafeReturnUrl(
  raw: string | null,
  opts?: ParseSafeReturnUrlOptions,
): string {
  const fallback = opts?.fallback ?? '/app';
  const origin = resolveOrigin(opts?.origin);

  if (raw === null || raw === '') return fallback;

  // Backslash check (raw `\` or URL-encoded `%5C`, case-insensitive).
  if (raw.includes('\\') || /(?:%5c)/i.test(raw)) return fallback;

  let parsed: URL;
  try {
    parsed = new URL(raw, origin);
  } catch {
    return fallback;
  }

  // Cross-origin check — scheme-relative `//evil.com` and `https://evil.com` both fail here.
  if (parsed.origin !== origin) return fallback;

  // Allowlist check.
  if (!isInternalPath(parsed.pathname)) return fallback;

  return parsed.pathname + parsed.search + parsed.hash;
}
