/**
 * Tests for conditionalBusinessRuleValidator.
 *
 * The validator is a pure FormGroup-level ValidatorFn that inspects
 * `conditionType` and marks child controls as invalid when their required
 * value is missing, according to UV-9 AC1–AC4.
 *
 * Test strategy: build a minimal FormGroup in isolation — no TestBed required.
 * Pure function approach: faster, no Angular DI overhead.
 *
 * Covers:
 *   A. REQUEST_TYPE → requestTypeId required (UV-9 AC1)
 *   B. DEADLINE → deadlineDays required / invalid (UV-9 AC2)
 *   C. REQUEST_TYPE_AND_DEADLINE → both required (UV-9 AC3)
 *   D. Hidden fields do not block submit (UV-9 AC4)
 *   E. Valid cases return null
 */
import '@angular/compiler';
import { FormBuilder } from '@angular/forms';
import { describe, expect, it } from 'vitest';

import { conditionalBusinessRuleValidator } from './conditional-validators';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fb = new FormBuilder();

function makeGroup(
  conditionType: string,
  requestTypeId: number | null,
  deadlineDays: number | null,
) {
  const fg = fb.group({
    conditionType: fb.nonNullable.control(conditionType),
    requestTypeId: fb.control<number | null>(requestTypeId),
    deadlineDays: fb.control<number | null>(deadlineDays),
  });
  return fg;
}

// ─────────────────────────────────────────────────────────────────────────────
// A. REQUEST_TYPE — requestTypeId required
// ─────────────────────────────────────────────────────────────────────────────

describe('conditionalBusinessRuleValidator — A. REQUEST_TYPE', () => {
  it('UV-9 AC1: error when requestTypeId is null', () => {
    const fg = makeGroup('REQUEST_TYPE', null, null);
    const result = conditionalBusinessRuleValidator(fg);
    expect(result).not.toBeNull();
    expect(fg.controls.requestTypeId.hasError('requiredForRuleType')).toBe(true);
  });

  it('UV-9 AC1: no error when requestTypeId has a value > 0', () => {
    const fg = makeGroup('REQUEST_TYPE', 5, null);
    const result = conditionalBusinessRuleValidator(fg);
    expect(result).toBeNull();
    expect(fg.controls.requestTypeId.hasError('requiredForRuleType')).toBe(false);
  });

  it('UV-9 AC4: deadlineDays is ignored (hidden field) for REQUEST_TYPE', () => {
    // deadlineDays has a value but that should not matter for REQUEST_TYPE
    const fg = makeGroup('REQUEST_TYPE', 3, 99);
    const result = conditionalBusinessRuleValidator(fg);
    expect(result).toBeNull();
    expect(fg.controls.deadlineDays.hasError('requiredForRuleType')).toBe(false);
  });

  it('UV-9 AC4: residual deadlineDays does not block when REQUEST_TYPE + requestTypeId valid', () => {
    // Simulates a user who switched from DEADLINE (had deadlineDays=5) to REQUEST_TYPE
    const fg = makeGroup('REQUEST_TYPE', 2, 5);
    const result = conditionalBusinessRuleValidator(fg);
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B. DEADLINE — deadlineDays required
// ─────────────────────────────────────────────────────────────────────────────

describe('conditionalBusinessRuleValidator — B. DEADLINE', () => {
  it('UV-9 AC2: error when deadlineDays is null', () => {
    const fg = makeGroup('DEADLINE', null, null);
    const result = conditionalBusinessRuleValidator(fg);
    expect(result).not.toBeNull();
    expect(fg.controls.deadlineDays.hasError('requiredForRuleType')).toBe(true);
  });

  it('UV-9 AC2: error when deadlineDays is negative', () => {
    const fg = makeGroup('DEADLINE', null, -1);
    const result = conditionalBusinessRuleValidator(fg);
    expect(result).not.toBeNull();
    expect(fg.controls.deadlineDays.hasError('min')).toBe(true);
  });

  it('UV-9 AC6: deadlineDays = 0 is valid', () => {
    const fg = makeGroup('DEADLINE', null, 0);
    const result = conditionalBusinessRuleValidator(fg);
    expect(result).toBeNull();
    expect(fg.controls.deadlineDays.hasError('requiredForRuleType')).toBe(false);
  });

  it('DEADLINE: deadlineDays = 3 is valid', () => {
    const fg = makeGroup('DEADLINE', null, 3);
    const result = conditionalBusinessRuleValidator(fg);
    expect(result).toBeNull();
  });

  it('DEADLINE: requestTypeId is ignored (hidden field)', () => {
    const fg = makeGroup('DEADLINE', 99, 5);
    const result = conditionalBusinessRuleValidator(fg);
    expect(result).toBeNull();
    expect(fg.controls.requestTypeId.hasError('requiredForRuleType')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C. REQUEST_TYPE_AND_DEADLINE — both fields required
// ─────────────────────────────────────────────────────────────────────────────

describe('conditionalBusinessRuleValidator — C. REQUEST_TYPE_AND_DEADLINE', () => {
  it('UV-9 AC3: error when requestTypeId is null (deadlineDays valid)', () => {
    const fg = makeGroup('REQUEST_TYPE_AND_DEADLINE', null, 5);
    const result = conditionalBusinessRuleValidator(fg);
    expect(result).not.toBeNull();
    expect(fg.controls.requestTypeId.hasError('requiredForRuleType')).toBe(true);
    expect(fg.controls.deadlineDays.hasError('requiredForRuleType')).toBe(false);
  });

  it('UV-9 AC3: error when deadlineDays is null (requestTypeId valid)', () => {
    const fg = makeGroup('REQUEST_TYPE_AND_DEADLINE', 3, null);
    const result = conditionalBusinessRuleValidator(fg);
    expect(result).not.toBeNull();
    expect(fg.controls.deadlineDays.hasError('requiredForRuleType')).toBe(true);
    expect(fg.controls.requestTypeId.hasError('requiredForRuleType')).toBe(false);
  });

  it('UV-9 AC3: error when both are missing', () => {
    const fg = makeGroup('REQUEST_TYPE_AND_DEADLINE', null, null);
    const result = conditionalBusinessRuleValidator(fg);
    expect(result).not.toBeNull();
    expect(fg.controls.requestTypeId.hasError('requiredForRuleType')).toBe(true);
    expect(fg.controls.deadlineDays.hasError('requiredForRuleType')).toBe(true);
  });

  it('UV-9 AC3: valid when both requestTypeId and deadlineDays present', () => {
    const fg = makeGroup('REQUEST_TYPE_AND_DEADLINE', 3, 10);
    const result = conditionalBusinessRuleValidator(fg);
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D. Error cleanup — previous errors cleared when condition changes
// ─────────────────────────────────────────────────────────────────────────────

describe('conditionalBusinessRuleValidator — D. Error cleanup', () => {
  it('requiredForRuleType cleared on control when field becomes valid', () => {
    // Start with REQUEST_TYPE, no requestTypeId → error set
    const fg = makeGroup('REQUEST_TYPE', null, null);
    conditionalBusinessRuleValidator(fg);
    expect(fg.controls.requestTypeId.hasError('requiredForRuleType')).toBe(true);

    // Now requestTypeId is filled → rerun validator → error cleared
    fg.controls.requestTypeId.setValue(5);
    const result = conditionalBusinessRuleValidator(fg);
    expect(result).toBeNull();
    expect(fg.controls.requestTypeId.hasError('requiredForRuleType')).toBe(false);
  });

  it('min error cleared on deadlineDays when value becomes valid', () => {
    const fg = makeGroup('DEADLINE', null, -1);
    conditionalBusinessRuleValidator(fg);
    expect(fg.controls.deadlineDays.hasError('min')).toBe(true);

    fg.controls.deadlineDays.setValue(3);
    const result = conditionalBusinessRuleValidator(fg);
    expect(result).toBeNull();
    expect(fg.controls.deadlineDays.hasError('min')).toBe(false);
  });
});
