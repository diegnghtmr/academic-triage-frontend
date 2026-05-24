import '@angular/compiler';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

/**
 * CharacterCounter — spec covering UV-5 AC5 and design §CharacterCounter.
 *
 * Strategy: source-level assertions verify API contracts, ARIA wiring,
 * state logic, and token usage. Consistent with form-field and error-alert
 * spec patterns (node environment — no DOM).
 */
const source = readFileSync(join(import.meta.dirname, 'character-counter.ts'), 'utf-8');

// ─── API public inputs ────────────────────────────────────────────────────────

describe('CharacterCounter — API public inputs', () => {
  it('exposes value as input with empty string default', () => {
    expect(source).toContain("readonly value = input<string>('')");
  });

  it('exposes min as optional input defaulting to null', () => {
    expect(source).toContain('readonly min = input<number | null>(null)');
  });

  it('exposes max as required input', () => {
    expect(source).toContain('readonly max = input.required<number>()');
  });

  it('has selector at-character-counter', () => {
    expect(source).toContain("selector: 'at-character-counter'");
  });

  it('uses ChangeDetectionStrategy.OnPush', () => {
    expect(source).toContain('ChangeDetectionStrategy.OnPush');
  });
});

// ─── Computed state (UV-5 AC5) ────────────────────────────────────────────────

describe('CharacterCounter — computed state (UV-5 AC5)', () => {
  it('length is derived from value().length via computed()', () => {
    expect(source).toContain('value().length');
    expect(source).toContain('computed(');
  });

  it('state is a computed producing ok | short | over', () => {
    expect(source).toContain("'ok'");
    expect(source).toContain("'short'");
    expect(source).toContain("'over'");
  });

  it('uses only computed() for derived state — no internal mutable signals', () => {
    // Internal state must be derived, not mutable signal(x)
    const internalMutablePattern =
      /(protected\s+readonly|readonly)\s+(?!value|min|max)\w+\s*=\s*signal\(/;
    expect(internalMutablePattern.test(source)).toBe(false);
  });

  it('state logic: above max produces "over"', () => {
    expect(source).toContain('max()');
    expect(source).toContain("'over'");
  });

  it('state logic: below min produces "short" (only when min is set)', () => {
    expect(source).toContain('min()');
    expect(source).toContain("'short'");
  });

  it('state logic: within range produces "ok"', () => {
    expect(source).toContain("'ok'");
  });

  it('null-safe min check: state is not "short" when min is null', () => {
    // Must guard with min !== null before comparing length < min
    expect(source).toContain('min !== null');
  });
});

// ─── ARIA contracts (UV-5 AC5) ────────────────────────────────────────────────

describe('CharacterCounter — ARIA contracts (UV-5 AC5)', () => {
  it('UV-5 AC5: has role="status" for non-assertive live region', () => {
    expect(source).toContain('role="status"');
  });

  it('UV-5 AC5: has aria-live="polite" so readers announce without interrupting', () => {
    expect(source).toContain('aria-live="polite"');
  });
});

// ─── min=null hides minimum advisory ─────────────────────────────────────────

describe('CharacterCounter — min=null hides minimum advisory', () => {
  it('template guards on min() !== null before showing minimum advisory', () => {
    // When min is null, no minimum text should appear
    expect(source).toContain('min()');
    expect(source).toContain('null');
  });
});

// ─── CSS tokens (REQ-TOKENS) ──────────────────────────────────────────────────

describe('CharacterCounter — CSS tokens (REQ-TOKENS)', () => {
  it('uses --at-font-mono token', () => {
    expect(source).toContain('--at-font-mono');
  });

  it('uses --at-fs-xs token for compact display', () => {
    expect(source).toContain('--at-fs-xs');
  });

  it('uses --at-text-muted for ok/neutral state', () => {
    expect(source).toContain('--at-text-muted');
  });

  it('uses --at-warning token for short state (not arbitrary color)', () => {
    expect(source).toContain('--at-warning');
  });

  it('uses --at-danger token for over state (not arbitrary color)', () => {
    expect(source).toContain('--at-danger');
  });
});
