/**
 * integerOnlyValidator
 *
 * A pure ValidatorFn that rejects decimal values in a form control.
 *
 * Contract (UV-9 AC5, UV-9 AC6):
 *   - null / undefined / '' → null (delegate required-field check to Validators.required)
 *   - value that is an integer (Number.isInteger) → null
 *   - value that is a decimal → { integer: true }
 *   - NaN or non-parseable strings → { integer: true }
 *
 * Key principle: decimals are REJECTED with an explicit error.
 * They are NEVER silently truncated (R9 hard rule).
 *
 * The error key 'integer' maps to "Debe ser un número entero"
 * via validation-messages.ts.
 */

import type { AbstractControl, ValidationErrors } from '@angular/forms';

export function integerOnlyValidator(control: AbstractControl): ValidationErrors | null {
  const raw = control.value as unknown;

  // Empty / absent — let Validators.required handle this separately
  if (raw === null || raw === undefined || raw === '') {
    return null;
  }

  // Attempt numeric parse
  const numeric = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'));

  // NaN is not an integer
  if (Number.isNaN(numeric)) {
    return { integer: true };
  }

  // Reject decimals — no silent truncation
  if (!Number.isInteger(numeric)) {
    return { integer: true };
  }

  return null;
}
