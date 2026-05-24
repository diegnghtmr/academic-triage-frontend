/**
 * conditionalBusinessRuleValidator
 *
 * FormGroup-level ValidatorFn that enforces conditional required-field rules
 * for business rules, based on the active `conditionType`:
 *
 * | conditionType              | requestTypeId | deadlineDays   |
 * |----------------------------|---------------|----------------|
 * | REQUEST_TYPE               | required      | ignored        |
 * | DEADLINE                   | ignored       | required (≥ 0) |
 * | REQUEST_TYPE_AND_DEADLINE  | required      | required (≥ 0) |
 *
 * Design:
 * - Pure function (no @Injectable) — aligns with D-5 / UV-9.
 * - Errors are set directly on child controls so `at-form-field` can surface them.
 * - Returns a non-null ValidationErrors object when any child is invalid,
 *   making the FormGroup itself invalid and blocking submit naturally.
 * - Hidden fields (not required by the active conditionType) have their
 *   conditional errors cleared, so they never block submit (UV-9 AC4).
 */

import type { AbstractControl, ValidationErrors } from '@angular/forms';

type ConditionType = 'REQUEST_TYPE' | 'DEADLINE' | 'REQUEST_TYPE_AND_DEADLINE';

/**
 * Clears errors keyed by `keys` from a control without touching other errors.
 * Uses `setErrors(null)` when no errors remain, so Angular marks the control valid.
 */
function clearErrors(control: AbstractControl, keys: string[]): void {
  const current = control.errors;
  if (current === null) return;

  const next: Record<string, unknown> = { ...current };
  for (const key of keys) {
    delete next[key];
  }
  const hasErrors = Object.keys(next).length > 0;
  control.setErrors(hasErrors ? next : null, { emitEvent: false });
}

/**
 * Merges `additions` into a control's existing errors without clearing other ones.
 */
function addErrors(control: AbstractControl, additions: ValidationErrors): void {
  const current = control.errors ?? {};
  control.setErrors({ ...current, ...additions }, { emitEvent: false });
}

/**
 * Validates `requestTypeId`: must not be null (required for the rule type).
 * Returns true when valid, false when invalid (sets error on the control).
 */
function validateRequestTypeId(
  control: AbstractControl,
  required: boolean,
): boolean {
  const CONDITIONAL_KEYS = ['requiredForRuleType'];

  if (!required) {
    clearErrors(control, CONDITIONAL_KEYS);
    return true;
  }

  const value: unknown = control.value;
  if (value === null || value === undefined || value === '') {
    addErrors(control, { requiredForRuleType: true });
    return false;
  }

  clearErrors(control, CONDITIONAL_KEYS);
  return true;
}

/**
 * Validates `deadlineDays`: must not be null and must be >= 0 when required.
 * Returns true when valid, false otherwise (sets error on the control).
 */
function validateDeadlineDays(
  control: AbstractControl,
  required: boolean,
): boolean {
  const CONDITIONAL_KEYS = ['requiredForRuleType', 'min'];

  if (!required) {
    clearErrors(control, CONDITIONAL_KEYS);
    return true;
  }

  const value: unknown = control.value;
  if (value === null || value === undefined || value === '') {
    clearErrors(control, ['min']);
    addErrors(control, { requiredForRuleType: true });
    return false;
  }

  const num = Number(value);
  if (num < 0) {
    clearErrors(control, ['requiredForRuleType']);
    addErrors(control, { min: { min: 0, actual: num } });
    return false;
  }

  clearErrors(control, CONDITIONAL_KEYS);
  return true;
}

/**
 * FormGroup-level validator for business rule forms.
 *
 * Usage:
 *   fb.nonNullable.group({ ... }, { validators: conditionalBusinessRuleValidator })
 */
export function conditionalBusinessRuleValidator(
  group: AbstractControl,
): ValidationErrors | null {
  const conditionType = group.get('conditionType')?.value as ConditionType | undefined;
  const requestTypeIdCtrl = group.get('requestTypeId');
  const deadlineDaysCtrl = group.get('deadlineDays');

  if (!requestTypeIdCtrl || !deadlineDaysCtrl) {
    return null;
  }

  const needsRequestType =
    conditionType === 'REQUEST_TYPE' || conditionType === 'REQUEST_TYPE_AND_DEADLINE';

  const needsDeadline =
    conditionType === 'DEADLINE' || conditionType === 'REQUEST_TYPE_AND_DEADLINE';

  const requestTypeValid = validateRequestTypeId(requestTypeIdCtrl, needsRequestType);
  const deadlineValid = validateDeadlineDays(deadlineDaysCtrl, needsDeadline);

  return requestTypeValid && deadlineValid ? null : { conditionalRequiredFailed: true };
}
