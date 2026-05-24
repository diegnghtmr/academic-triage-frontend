import type { AbstractControl, FormGroup } from '@angular/forms';

import type { ProblemDetail } from '../../core/http/problem-detail';

/**
 * Shape of each item in the `ErrorSummary` — imported by consumers.
 * Defined here to avoid a circular dependency with the ErrorSummary component.
 */
export interface ErrorSummaryItem {
  readonly field: string | null;
  readonly message: string;
  readonly controlId?: string;
}

/**
 * Result returned by `applyProblemToForm`.
 */
export interface ApplyResult {
  /**
   * Errors not mapped to known controls, plus `detail`/`title` as global fallbacks.
   * Pass this array directly to `<at-error-summary [items]="...">`.
   */
  readonly remainingGlobal: readonly ErrorSummaryItem[];
}

/**
 * Resolves a control from a FormGroup by logical field name.
 * Supports dot-notation for nested groups (e.g. `address.city`).
 *
 * Exposed for unit tests (Design §D-7).
 */
export function matchControl(form: FormGroup, field: string): AbstractControl | null {
  return form.get(field) ?? null;
}

/**
 * Applies a `ProblemDetail` response to a `FormGroup`:
 *
 * 1. Known `fieldErrors[]` entries → `control.setErrors({ server: message })`.
 * 2. Unknown field entries → pushed to `remainingGlobal`.
 * 3. `detail` → always pushed to `remainingGlobal` when present.
 * 4. Fallback to `title` when neither `fieldErrors` nor `detail` exist.
 *
 * Malformed or null `fieldErrors` entries are silently ignored (UV-6 AC3).
 * Does NOT parse `detail` to infer duplicate fields (REQ-NO-DUPLICATE-PARSE).
 */
export function applyProblemToForm(
  problem: ProblemDetail | null,
  form: FormGroup,
  controlIdMap: Readonly<Record<string, string>>,
): ApplyResult {
  if (problem === null || problem === undefined) {
    return { remainingGlobal: [] };
  }

  const remainingGlobal: ErrorSummaryItem[] = [];

  const hasFieldErrors =
    Array.isArray(problem.fieldErrors) && problem.fieldErrors.length > 0;

  if (hasFieldErrors && problem.fieldErrors) {
    for (const entry of problem.fieldErrors) {
      // Ignore null/undefined/malformed entries (UV-6 AC3)
      if (
        entry === null ||
        entry === undefined ||
        typeof entry.field !== 'string' ||
        entry.field.length === 0 ||
        typeof entry.message !== 'string'
      ) {
        continue;
      }

      const control = matchControl(form, entry.field);
      if (control !== null) {
        // Merge server error, preserving existing client-side errors
        const existing = control.errors ?? {};
        control.setErrors({ ...existing, server: entry.message });
      } else {
        // Unknown field → goes to remainingGlobal
        const controlId = controlIdMap[entry.field];
        const item: ErrorSummaryItem = {
          field: entry.field,
          message: entry.message,
          ...(controlId !== undefined ? { controlId } : {}),
        };
        remainingGlobal.push(item);
      }
    }
  }

  // `detail` always goes to remainingGlobal when present (UV-6 AC4)
  if (typeof problem.detail === 'string' && problem.detail.length > 0) {
    remainingGlobal.push({ field: null, message: problem.detail });
  } else if (!hasFieldErrors) {
    // Fallback: title when no fieldErrors and no detail
    if (typeof problem.title === 'string' && problem.title.length > 0) {
      remainingGlobal.push({ field: null, message: problem.title });
    }
  }

  return { remainingGlobal };
}

/**
 * Clears only the `server` error key from every control in the form.
 * Should be called before a retry submit to remove stale server errors.
 *
 * Preserves all other validator errors (required, minlength, etc.).
 */
export function clearServerErrors(form: FormGroup): void {
  for (const control of Object.values(form.controls)) {
    const errors = control.errors;
    if (errors === null || errors['server'] === undefined) {
      continue;
    }
    const { server: _, ...rest } = errors;
    control.setErrors(Object.keys(rest).length > 0 ? rest : null);
  }
}
