/**
 * Tests for integerOnlyValidator — UV-9 AC5 (decimal-reject), UV-9 AC6 (0 valid).
 *
 * Strict TDD: these tests are written BEFORE the implementation.
 * The validator lives at:
 *   src/app/features/business-rules/validators/integer-validator.ts
 *
 * Key behaviors:
 * - null / undefined / '' → null (required is a separate concern)
 * - Valid integers (0, 1, 100, -1, "100", "-1", "0") → null
 * - Decimal values (1.5, 0.1, -2.3, "1.5", "0.1", "-2.3") → { integer: true }
 * - Comma-as-decimal-separator strings ("1,5") → { integer: true }
 * - NaN / non-numeric strings → { integer: true }
 *
 * UV-12.AC4: tests for decimal rejection and acceptance of 0 included.
 */
import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { FormControl } from '@angular/forms';

import { integerOnlyValidator } from './integer-validator';

function ctrl(value: unknown): FormControl {
  return new FormControl(value);
}

describe('integerOnlyValidator — valid integers → null', () => {
  it('value 0 → null (UV-9 AC6: 0 is valid)', () => {
    expect(integerOnlyValidator(ctrl(0))).toBeNull();
  });

  it('value 1 → null', () => {
    expect(integerOnlyValidator(ctrl(1))).toBeNull();
  });

  it('value 100 → null', () => {
    expect(integerOnlyValidator(ctrl(100))).toBeNull();
  });

  it('value -1 → null', () => {
    expect(integerOnlyValidator(ctrl(-1))).toBeNull();
  });

  it('string "0" → null', () => {
    expect(integerOnlyValidator(ctrl('0'))).toBeNull();
  });

  it('string "100" → null', () => {
    expect(integerOnlyValidator(ctrl('100'))).toBeNull();
  });

  it('string "-1" → null', () => {
    expect(integerOnlyValidator(ctrl('-1'))).toBeNull();
  });

  it('string "42" → null', () => {
    expect(integerOnlyValidator(ctrl('42'))).toBeNull();
  });
});

describe('integerOnlyValidator — empty/null/undefined → null (required handles this)', () => {
  it('null → null', () => {
    expect(integerOnlyValidator(ctrl(null))).toBeNull();
  });

  it('undefined → null', () => {
    expect(integerOnlyValidator(ctrl(undefined))).toBeNull();
  });

  it('empty string "" → null', () => {
    expect(integerOnlyValidator(ctrl(''))).toBeNull();
  });
});

describe('integerOnlyValidator — decimal values → { integer: true } (UV-9 AC5)', () => {
  it('value 1.5 → { integer: true }', () => {
    expect(integerOnlyValidator(ctrl(1.5))).toEqual({ integer: true });
  });

  it('value 0.1 → { integer: true }', () => {
    expect(integerOnlyValidator(ctrl(0.1))).toEqual({ integer: true });
  });

  it('value -2.3 → { integer: true }', () => {
    expect(integerOnlyValidator(ctrl(-2.3))).toEqual({ integer: true });
  });

  it('string "1.5" → { integer: true }', () => {
    expect(integerOnlyValidator(ctrl('1.5'))).toEqual({ integer: true });
  });

  it('string "0.1" → { integer: true }', () => {
    expect(integerOnlyValidator(ctrl('0.1'))).toEqual({ integer: true });
  });

  it('string "-2.3" → { integer: true }', () => {
    expect(integerOnlyValidator(ctrl('-2.3'))).toEqual({ integer: true });
  });

  it('string "1,5" (comma decimal) → { integer: true }', () => {
    expect(integerOnlyValidator(ctrl('1,5'))).toEqual({ integer: true });
  });

  it('string "1.0" (explicit .0 notation) → null (1.0 === integer 1)', () => {
    // "1.0" parses to 1 which is integer — this is fine
    expect(integerOnlyValidator(ctrl('1.0'))).toBeNull();
  });

  it('does NOT truncate silently: 1.5 is rejected, not coerced to 1', () => {
    // This is the core of UV-9 AC5: { integer: true } error, NOT null
    const result = integerOnlyValidator(ctrl(1.5));
    expect(result).not.toBeNull();
    expect(result).toEqual({ integer: true });
  });
});

describe('integerOnlyValidator — NaN / non-numeric strings → { integer: true }', () => {
  it('NaN → { integer: true }', () => {
    expect(integerOnlyValidator(ctrl(NaN))).toEqual({ integer: true });
  });

  it('string "abc" → { integer: true }', () => {
    expect(integerOnlyValidator(ctrl('abc'))).toEqual({ integer: true });
  });

  it('string "1e2" → null (100 is an integer)', () => {
    // 1e2 = 100, which is integer
    expect(integerOnlyValidator(ctrl('1e2'))).toBeNull();
  });
});
