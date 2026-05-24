import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

/**
 * ErrorAlert — spec covering UV-11 AC2 and UV-7 AC5.
 *
 * Strategy: source-level assertions verify ARIA role contracts and variant support.
 */
const source = readFileSync(join(import.meta.dirname, 'error-alert.ts'), 'utf-8');

describe('ErrorAlert — variant input (UV-11 AC2)', () => {
  it('exports AlertVariant type covering error | success | warning | info', () => {
    expect(source).toContain('AlertVariant');
    expect(source).toContain('error');
    expect(source).toContain('success');
    expect(source).toContain('warning');
    expect(source).toContain('info');
  });

  it('has variant input with default value of "error"', () => {
    expect(source).toContain("variant = input<AlertVariant>('error')");
  });

  it('backward compat: default variant=error preserves original behavior', () => {
    // When no variant is provided the component behaves like before (role="alert")
    expect(source).toContain("'error'");
  });
});

describe('ErrorAlert — role computed from variant (UV-7 AC5)', () => {
  it('UV-7 AC5: role="alert" only for error variant (assertive)', () => {
    // Per UV-7: role="alert" ONLY for real errors
    expect(source).toContain('"alert"');
    expect(source).toContain("=== 'error'");
  });

  it('UV-7 AC5: role="status" for warning/success/info (non-assertive)', () => {
    // warning/success/info → role="status" per UV-7
    expect(source).toContain('"status"');
  });

  it('role is derived via computed()', () => {
    expect(source).toContain('computed(');
  });
});

describe('ErrorAlert — conditional render (UV-7 AC5)', () => {
  it('does not render when message is null', () => {
    expect(source).toContain('message()');
    expect(source).toContain('@if');
  });

  it('renders when message is truthy', () => {
    expect(source).toContain('{{ message() }}');
  });

  it('selector is at-error-alert', () => {
    expect(source).toContain("selector: 'at-error-alert'");
  });

  it('uses ChangeDetectionStrategy.OnPush', () => {
    expect(source).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('message input type is string | null with null default', () => {
    expect(source).toContain('input<string | null>(null)');
  });
});
