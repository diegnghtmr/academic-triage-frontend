import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { FormBuilder, Validators } from '@angular/forms';

import type { ProblemDetail } from '../../core/http/problem-detail';
import { applyProblemToForm, clearServerErrors, matchControl } from './problem-field-mapper';

// Helper to build a simple form group for tests
function buildForm() {
  const fb = new FormBuilder();
  return fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });
}

describe('ProblemFieldMapper — matchControl (UV-6 AC1, UV-12 AC1)', () => {
  it('returns the control for a known top-level field', () => {
    const form = buildForm();
    const control = matchControl(form, 'email');
    expect(control).toBe(form.controls.email);
  });

  it('returns null for an unknown field', () => {
    const form = buildForm();
    const control = matchControl(form, 'unknownField');
    expect(control).toBeNull();
  });

  it('supports dot-notation for nested controls', () => {
    const fb = new FormBuilder();
    const form = fb.nonNullable.group({
      address: fb.nonNullable.group({
        city: [''],
      }),
    });
    const control = matchControl(form, 'address.city');
    expect(control).toBe(form.get('address.city'));
  });
});

describe('ProblemFieldMapper — applyProblemToForm', () => {
  it('UV-6 AC1: maps known fieldErrors to the corresponding FormControl', () => {
    const form = buildForm();
    const problem: ProblemDetail = {
      status: 400,
      fieldErrors: [{ field: 'email', message: 'Email already taken' }],
    };

    applyProblemToForm(problem, form, { email: 'reg-email' });

    expect(form.controls.email.errors).toMatchObject({ server: 'Email already taken' });
  });

  it('UV-6 AC2: puts unknown fields in remainingGlobal', () => {
    const form = buildForm();
    const problem: ProblemDetail = {
      status: 400,
      fieldErrors: [{ field: 'unknownField', message: 'some error' }],
    };

    const { remainingGlobal } = applyProblemToForm(problem, form, {});

    expect(remainingGlobal).toHaveLength(1);
    expect(remainingGlobal[0].message).toBe('some error');
  });

  it('UV-6 AC3: ignores malformed entries without crashing', () => {
    const form = buildForm();
    const problem = {
      status: 400,
      // intentionally passing malformed fieldErrors with nulls/missing properties
      fieldErrors: [
        null as unknown as { field: string; message: string },
        { field: '', message: 'x' },
        { field: 'email' } as unknown as { field: string; message: string },
      ],
    } as ProblemDetail;

    expect(() => applyProblemToForm(problem, form, {})).not.toThrow();
  });

  it('UV-6 AC4: uses detail as global fallback when fieldErrors is null/empty', () => {
    const form = buildForm();
    const problem: ProblemDetail = {
      status: 409,
      detail: 'Ya existe un usuario con ese correo',
      fieldErrors: null,
    };

    const { remainingGlobal } = applyProblemToForm(problem, form, {});

    expect(remainingGlobal).toHaveLength(1);
    expect(remainingGlobal[0].message).toBe('Ya existe un usuario con ese correo');
    expect(remainingGlobal[0].field).toBeNull();
  });

  it('UV-6 AC5: 409 with only detail shows it in remainingGlobal — not parsed', () => {
    const form = buildForm();
    const problem: ProblemDetail = {
      status: 409,
      detail: "Ya existe un usuario con email 'user@example.com'",
    };

    const { remainingGlobal } = applyProblemToForm(problem, form, {});

    expect(remainingGlobal[0].message).toContain('usuario con email');
    // Must NOT set server error on email control (REQ-NO-DUPLICATE-PARSE)
    // (email control may still have required validator error, but NOT server error)
    expect(form.controls.email.errors?.['server']).toBeUndefined();
  });

  it('uses title as fallback when neither fieldErrors nor detail are present', () => {
    const form = buildForm();
    const problem: ProblemDetail = {
      status: 500,
      title: 'Internal Server Error',
    };

    const { remainingGlobal } = applyProblemToForm(problem, form, {});

    expect(remainingGlobal).toHaveLength(1);
    expect(remainingGlobal[0].message).toBe('Internal Server Error');
  });

  it('returns empty remainingGlobal when problem has no usable content', () => {
    const form = buildForm();
    const problem: ProblemDetail = { status: 500 };

    const { remainingGlobal } = applyProblemToForm(problem, form, {});

    expect(remainingGlobal).toHaveLength(0);
  });

  it('when problem is null, returns empty remainingGlobal without crashing', () => {
    const form = buildForm();

    const { remainingGlobal } = applyProblemToForm(null, form, {});

    expect(remainingGlobal).toHaveLength(0);
  });

  it('enriches remainingGlobal item with controlId when provided in the map', () => {
    const form = buildForm();
    const problem: ProblemDetail = {
      status: 400,
      fieldErrors: [{ field: 'unknownField', message: 'err' }],
    };

    const { remainingGlobal } = applyProblemToForm(problem, form, {
      unknownField: 'some-dom-id',
    });

    expect(remainingGlobal[0].controlId).toBe('some-dom-id');
  });

  it('detail also appears in remainingGlobal when fieldErrors are present (UV-6 AC4)', () => {
    const form = buildForm();
    const problem: ProblemDetail = {
      status: 400,
      detail: 'One or more validation errors occurred',
      fieldErrors: [{ field: 'email', message: 'Email taken' }],
    };

    const { remainingGlobal } = applyProblemToForm(problem, form, { email: 'reg-email' });

    // detail MUST appear in remainingGlobal alongside inline fieldError
    const detailItem = remainingGlobal.find(
      (i) => i.message === 'One or more validation errors occurred',
    );
    expect(detailItem).toBeDefined();
  });
});

describe('ProblemFieldMapper — clearServerErrors (UV-12 AC1)', () => {
  it('removes server error from a control that has it', () => {
    const form = buildForm();
    form.controls.email.setErrors({ server: 'Email already taken' });

    clearServerErrors(form);

    expect(form.controls.email.errors).toBeNull();
  });

  it('preserves other validators — does not clear required/minlength errors', () => {
    const form = buildForm();
    // Set mixed errors (as FormControl.setErrors replaces, we test clearServerErrors removes server only)
    form.controls.email.setErrors({ required: true, server: 'server error' });

    clearServerErrors(form);

    // After clearing server, required should remain
    expect(form.controls.email.errors?.['required']).toBe(true);
    expect(form.controls.email.errors?.['server']).toBeUndefined();
  });

  it('does not throw when no server errors exist', () => {
    const form = buildForm();
    expect(() => clearServerErrors(form)).not.toThrow();
  });
});
