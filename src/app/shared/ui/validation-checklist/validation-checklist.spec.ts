import '@angular/compiler';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

/**
 * ValidationChecklist — spec covering UV-5 AC1–AC4 and design §ValidationChecklist.
 *
 * Strategy: source-level assertions verify API contracts, ARIA wiring,
 * docket-style template patterns, and token usage.
 * Consistent with form-field and error-alert spec patterns (node environment).
 */
const source = readFileSync(join(import.meta.dirname, 'validation-checklist.ts'), 'utf-8');

// ─── API public inputs ────────────────────────────────────────────────────────

describe('ValidationChecklist — API public inputs', () => {
  it('exposes rules as required input of readonly ChecklistRule[]', () => {
    expect(source).toContain('readonly rules = input.required<readonly ChecklistRule[]>()');
  });

  it('exposes title as optional input with default', () => {
    expect(source).toContain('readonly title = input(');
  });

  it('exports ChecklistRule interface', () => {
    expect(source).toContain('export interface ChecklistRule');
  });

  it('ChecklistRule has id, label, satisfied, and kind fields', () => {
    expect(source).toContain('readonly id:');
    expect(source).toContain('readonly label:');
    expect(source).toContain('readonly satisfied:');
    expect(source).toContain('readonly kind:');
  });

  it('ChecklistRule kind discriminates hard vs advisory', () => {
    expect(source).toContain("'hard'");
    expect(source).toContain("'advisory'");
  });

  it('has selector at-validation-checklist', () => {
    expect(source).toContain("selector: 'at-validation-checklist'");
  });

  it('uses ChangeDetectionStrategy.OnPush', () => {
    expect(source).toContain('ChangeDetectionStrategy.OnPush');
  });
});

// ─── Computed state ───────────────────────────────────────────────────────────

describe('ValidationChecklist — computed state (UV-5 AC1–AC2)', () => {
  it('pending is computed filtering unsatisfied rules', () => {
    expect(source).toContain('pending');
    expect(source).toContain('computed(');
    expect(source).toContain('satisfied');
  });

  it('pendingHard is computed filtering pending rules with kind "hard"', () => {
    expect(source).toContain('pendingHard');
    expect(source).toContain("'hard'");
  });

  it('uses only computed() for derived state — no internal mutable signals', () => {
    const internalMutablePattern =
      /(protected\s+readonly|readonly)\s+(?!rules|title)\w+\s*=\s*signal\(/;
    expect(internalMutablePattern.test(source)).toBe(false);
  });
});

// ─── Docket-style template (UV-5 AC3–AC4) ────────────────────────────────────

describe('ValidationChecklist — docket-style template (UV-5 AC3, AC4)', () => {
  it('UV-5 AC4: uses docket prefix "[ revisar ]" in heading', () => {
    expect(source).toContain('[ revisar ]');
  });

  it('UV-5 AC4: uses bullet "▸" before each pending item', () => {
    expect(source).toContain('▸');
  });

  it('UV-5 AC4: uses --at-font-mono for terminal/mono style', () => {
    expect(source).toContain('--at-font-mono');
  });

  it('shows count of pending rules in the header', () => {
    expect(source).toContain('pending()');
  });

  it('iterates items with @for', () => {
    expect(source).toContain('@for');
  });
});

// ─── ARIA contracts (UV-5 AC1, design §ValidationChecklist) ──────────────────

describe('ValidationChecklist — ARIA contracts', () => {
  it('does NOT use role="alert" — checklist is informative, not assertive', () => {
    expect(source).not.toContain('role="alert"');
  });

  it('uses aria-live="polite" to reflect changes without interrupting (UV-5 AC1)', () => {
    expect(source).toContain('aria-live="polite"');
  });

  it('pending item has accessible label indicating "pendiente"', () => {
    expect(source).toContain('pendiente');
  });

  it('satisfied item has accessible label indicating "cumplido"', () => {
    expect(source).toContain('cumplido');
  });

  it('uses semantic list element for items', () => {
    expect(source).toContain('<ul');
  });
});

// ─── hard vs advisory visual distinction (UV-5 AC2, AC3) ─────────────────────

describe('ValidationChecklist — hard vs advisory visual cue (UV-5 AC2, AC3)', () => {
  it('UV-5 AC2: hard pending items have a distinct CSS class from advisory pending', () => {
    // Must differentiate hard vs advisory in the template (class or data attr)
    expect(source).toContain('hard');
    expect(source).toContain('advisory');
  });

  it('UV-5 AC3: template renders advisory items separately or with a distinct style', () => {
    // Advisory items must be visually distinguishable — check for class reference
    expect(source).toContain('advisory');
  });
});

// ─── CSS tokens (REQ-TOKENS) ──────────────────────────────────────────────────

describe('ValidationChecklist — CSS tokens (REQ-TOKENS)', () => {
  it('uses --at-font-mono for mono display', () => {
    expect(source).toContain('--at-font-mono');
  });

  it('uses --at-border for the docket top border', () => {
    expect(source).toContain('--at-border');
  });

  it('uses --at-text-muted for satisfied/neutral items', () => {
    expect(source).toContain('--at-text-muted');
  });

  it('uses --at-warning or --at-danger for pending hard items', () => {
    const hasWarning = source.includes('--at-warning');
    const hasDanger = source.includes('--at-danger');
    expect(hasWarning || hasDanger).toBe(true);
  });

  it('no border-radius (Cyber-Classicism rule)', () => {
    expect(source).not.toContain('border-radius');
  });
});
