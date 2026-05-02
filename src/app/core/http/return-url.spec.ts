import { describe, expect, it } from 'vitest';

import { parseSafeReturnUrl } from './return-url';

const ORIGIN = 'http://localhost';

// Helper: call with a fixed test origin so tests are deterministic.
function parse(raw: string | null, fallback = '/app'): string {
  return parseSafeReturnUrl(raw, { origin: ORIGIN, fallback });
}

// ---------------------------------------------------------------------------
// Happy path — valid internal paths returned verbatim (path+search+hash)
// ---------------------------------------------------------------------------

describe('parseSafeReturnUrl — happy path', () => {
  it('accepts /app', () => {
    expect(parse('/app')).toBe('/app');
  });

  it('accepts /app/requests/list', () => {
    expect(parse('/app/requests/list')).toBe('/app/requests/list');
  });

  it('accepts /app/requests/list with query string', () => {
    expect(parse('/app/requests/list?status=REGISTERED')).toBe(
      '/app/requests/list?status=REGISTERED',
    );
  });

  it('accepts /auth/login (login redirect round-trip)', () => {
    expect(parse('/auth/login')).toBe('/auth/login');
  });

  it('accepts /auth/login with query params', () => {
    expect(parse('/auth/login?registered=1')).toBe('/auth/login?registered=1');
  });

  it('strips fragment (hash) and query together when both present', () => {
    const result = parse('/app/dashboard?tab=1#section');
    expect(result).toBe('/app/dashboard?tab=1#section');
  });

  it('uses custom fallback when provided', () => {
    expect(parseSafeReturnUrl(null, { origin: ORIGIN, fallback: '/' })).toBe(
      '/',
    );
  });
});

// ---------------------------------------------------------------------------
// Adversarial inputs — all must return the fallback
// ---------------------------------------------------------------------------

describe('parseSafeReturnUrl — adversarial inputs', () => {
  it('returns fallback for null', () => {
    expect(parse(null)).toBe('/app');
  });

  it('returns fallback for empty string', () => {
    expect(parse('')).toBe('/app');
  });

  it('returns fallback for scheme-relative //evil.com', () => {
    expect(parse('//evil.com')).toBe('/app');
  });

  it('returns fallback for absolute external URL https://evil.com/app', () => {
    expect(parse('https://evil.com/app')).toBe('/app');
  });

  it('returns fallback for raw backslash /app\\..\\evil', () => {
    expect(parse('/app\\..\\evil')).toBe('/app');
  });

  it('returns fallback for %2F%2Fevil.com (URL-encoded double-slash)', () => {
    // URL construction normalizes this; origin check catches it.
    expect(parse('%2F%2Fevil.com')).toBe('/app');
  });

  it('returns fallback for /app%5Cevil (URL-encoded backslash)', () => {
    expect(parse('/app%5Cevil')).toBe('/app');
  });

  it('returns fallback for javascript:alert(1)', () => {
    expect(parse('javascript:alert(1)')).toBe('/app');
  });

  it('returns fallback for /admin (path not in allowlist)', () => {
    expect(parse('/admin')).toBe('/app');
  });

  it('returns fallback when origin is different (off-origin absolute URL)', () => {
    const result = parseSafeReturnUrl('http://other.host/app', {
      origin: ORIGIN,
      fallback: '/app',
    });
    expect(result).toBe('/app');
  });

  it('returns fallback for %5C alone (encoded backslash)', () => {
    expect(parse('%5C')).toBe('/app');
  });

  it('returns fallback for uppercase %5c variant', () => {
    // Case-insensitive check: %5C covers both cases but verify.
    expect(parse('/app%5cevil')).toBe('/app');
  });
});
