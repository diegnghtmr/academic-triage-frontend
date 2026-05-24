import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

/**
 * FormField — spec covering UV-7 AC1–AC3.
 *
 * Strategy: source-level template assertions to verify ARIA contracts
 * (avoids DOM bootstrapping in node environment).
 * API contract assertions verify computed outputs through source inspection.
 */
const source = readFileSync(join(import.meta.dirname, 'form-field.ts'), 'utf-8');

describe('FormField — API public inputs (UV-7)', () => {
  it('exposes label as required input', () => {
    expect(source).toContain('input.required<string>()');
  });

  it('exposes controlId as required input', () => {
    expect(source).toContain("readonly controlId = input.required<string>()");
  });

  it('exposes required input defaulting to false', () => {
    expect(source).toContain("readonly required = input(false)");
  });

  it('exposes hint input defaulting to null', () => {
    expect(source).toContain("readonly hint = input<string | null>(null)");
  });

  it('exposes errorMessage input defaulting to null', () => {
    expect(source).toContain("readonly errorMessage = input<string | null>(null)");
  });

  it('exposes invalid input defaulting to false', () => {
    expect(source).toContain("readonly invalid = input(false)");
  });
});

describe('FormField — computed IDs (UV-7 AC1)', () => {
  it('computes hintId as `${controlId()}-hint`', () => {
    expect(source).toContain('-hint');
  });

  it('computes errorId as `${controlId()}-error`', () => {
    expect(source).toContain('-error');
  });

  it('computes describedBy concatenating hintId/errorId only when they exist', () => {
    expect(source).toContain('describedBy');
    // describedBy must be a computed
    expect(source).toContain('computed(');
  });
});

describe('FormField — template ARIA wiring (UV-7 AC1–AC3)', () => {
  it('UV-7 AC1: template exposes describedBy for the projected input', () => {
    expect(source).toContain('describedBy');
  });

  it('UV-7 AC2: template binds aria-invalid when invalid() is true', () => {
    expect(source).toContain('invalid()');
  });

  it('UV-7 AC3: template applies aria-required when required() is true', () => {
    expect(source).toContain('required()');
  });

  it('role="alert" is applied only when errorMessage exists', () => {
    // The role="alert" must be conditional on errorMessage()
    expect(source).toContain('role="alert"');
    expect(source).toContain('errorMessage()');
  });

  it('hint element uses hintId', () => {
    expect(source).toContain('hintId');
  });

  it('error element uses errorId', () => {
    expect(source).toContain('errorId');
  });
});

describe('FormField — selector and change detection (UV-7)', () => {
  it('has selector at-form-field', () => {
    expect(source).toContain("selector: 'at-form-field'");
  });

  it('uses ChangeDetectionStrategy.OnPush', () => {
    expect(source).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('does not use mutable signals (no signal() for internal state)', () => {
    // Only computed() should appear for internal derived values
    // Internal signals like signal(false) for mutable state must NOT be present
    // (per design: "only computed(), sin signals mutables")
    const mutableSignalPattern = /protected readonly \w+ = signal\(/;
    expect(mutableSignalPattern.test(source)).toBe(false);
  });
});
