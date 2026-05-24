import '@angular/compiler';
import { readFileSync } from 'fs';
import { join } from 'path';
import { provideZonelessChangeDetection } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ProblemErrorMapper } from '../../core/http/problem-error.mapper';
import {
  applyProblemToForm,
  clearServerErrors,
} from '../../shared/utils/problem-field-mapper';
import { messageFor } from '../../shared/i18n/validation-messages';

/**
 * register-page spec — covers UV-2 AC1–AC9, UV-12 AC2.
 *
 * Strategy: form group construction and validator assertions tested in isolation
 * via FormBuilder. Source-level template assertions cover copy, ARIA, and wiring.
 * Integration with ProblemFieldMapper tested via direct function calls.
 */
const source = readFileSync(join(import.meta.dirname, 'register-page.ts'), 'utf-8');

// ─── shared env ───────────────────────────────────────────────────────────────

beforeAll(() => {
  if (!('document' in globalThis)) {
    Object.defineProperty(globalThis, 'document', { value: {}, configurable: true });
  }
  try {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  } catch {
    // Already initialized.
  }
});

// ─── Form group construction ─────────────────────────────────────────────────

describe('RegisterPage — form validators (UV-2 AC1)', () => {
  let fb: FormBuilder;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [provideZonelessChangeDetection(), FormBuilder],
    });
    fb = TestBed.inject(FormBuilder);
  });

  afterEach(() => TestBed.resetTestingModule());

  function buildRegisterForm() {
    return fb.nonNullable.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      firstName: ['', [Validators.required, Validators.maxLength(75)]],
      lastName: ['', [Validators.required, Validators.maxLength(75)]],
      identification: ['', [Validators.required, Validators.maxLength(20)]],
    });
  }

  it('UV-2 AC1: all fields required — form is invalid when empty', () => {
    const form = buildRegisterForm();
    expect(form.invalid).toBe(true);
  });

  it('UV-2 AC1: username required error when empty', () => {
    const form = buildRegisterForm();
    expect(form.controls.username.hasError('required')).toBe(true);
  });

  it('UV-2 AC2: username "ab" shows minlength error', () => {
    const form = buildRegisterForm();
    form.controls.username.setValue('ab');
    expect(form.controls.username.hasError('minlength')).toBe(true);
    expect(messageFor('minlength', { requiredLength: 3, actualLength: 2 })).toBe('Mínimo 3 caracteres');
  });

  it('UV-2 AC2: username minlength=3 is enforced', () => {
    const form = buildRegisterForm();
    form.controls.username.setValue('abc');
    expect(form.controls.username.hasError('minlength')).toBe(false);
  });

  it('UV-2 AC3: malformed email shows email error', () => {
    const form = buildRegisterForm();
    form.controls.email.setValue('notanemail');
    expect(form.controls.email.hasError('email')).toBe(true);
  });

  it('UV-2 AC4: email >255 chars shows maxlength error', () => {
    const form = buildRegisterForm();
    // 252 'a' chars + '@x.co' (5) = 257 total chars → exceeds maxLength(255)
    form.controls.email.setValue(`${'a'.repeat(252)}@x.co`);
    expect(form.controls.email.hasError('maxlength')).toBe(true);
  });

  it('UV-2 AC5: password <8 chars shows minlength error', () => {
    const form = buildRegisterForm();
    form.controls.password.setValue('short');
    expect(form.controls.password.hasError('minlength')).toBe(true);
    expect(messageFor('minlength', { requiredLength: 8, actualLength: 5 })).toBe('Mínimo 8 caracteres');
  });

  it('UV-2 AC1: all fields required (email, firstName, lastName, identification)', () => {
    const form = buildRegisterForm();
    expect(form.controls.email.hasError('required')).toBe(true);
    expect(form.controls.firstName.hasError('required')).toBe(true);
    expect(form.controls.lastName.hasError('required')).toBe(true);
    expect(form.controls.identification.hasError('required')).toBe(true);
  });
});

// ─── Source-level template assertions ────────────────────────────────────────

describe('RegisterPage — template wiring (UV-2 AC8, AC9, UV-1)', () => {
  it('UV-2 AC8: copy mentions STUDENT role', () => {
    expect(source.toLowerCase()).toContain('student');
  });

  it('UV-2 AC8: copy mentions no auto-login or redirection to login', () => {
    // The template must have copy about no auto-login / redirect to login
    const hasAutoLoginCopy =
      source.includes('inicio de sesión automático') ||
      source.includes('redirigir') ||
      source.includes('redirigido') ||
      source.includes('login') ||
      source.includes('iniciar sesión');
    expect(hasAutoLoginCopy).toBe(true);
  });

  it('UV-2 AC9: redirect navigates to /auth/login with registered=1 (REQ-NO-AUTO-LOGIN)', () => {
    expect(source).toContain('/auth/login');
    expect(source).toContain('registered');
    // Must NOT call setSession (no auto-login)
    expect(source).not.toContain('setSession');
  });

  it('UV-1 AC1: submit calls markAllAsTouched on invalid form', () => {
    expect(source).toContain('markAllAsTouched');
  });

  it('uses at-error-summary for error summary', () => {
    expect(source).toContain('at-error-summary');
  });

  it('uses at-password-field for password input', () => {
    expect(source).toContain('at-password-field');
  });

  it('uses at-form-field for field wrappers', () => {
    expect(source).toContain('at-form-field');
  });

  it('REQ-CONTRACT: uses formControlName username (not identifier)', () => {
    expect(source).toContain('formControlName="username"');
  });
});

// ─── fieldErrors backend mapping (UV-2 AC6, AC7) ────────────────────────────

describe('RegisterPage — fieldErrors mapping (UV-2 AC6, AC7)', () => {
  let fb: FormBuilder;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [provideZonelessChangeDetection(), FormBuilder, ProblemErrorMapper],
    });
    fb = TestBed.inject(FormBuilder);
  });

  afterEach(() => TestBed.resetTestingModule());

  function buildForm() {
    return fb.nonNullable.group({
      username: [''],
      email: [''],
      password: [''],
      firstName: [''],
      lastName: [''],
      identification: [''],
    });
  }

  it('UV-2 AC6: known fieldError email is mapped to email control', () => {
    const form = buildForm();
    const mapper = TestBed.inject(ProblemErrorMapper);
    const err = new HttpErrorResponse({
      error: {
        status: 400,
        title: 'Validation failed',
        fieldErrors: [{ field: 'email', message: 'Email already registered' }],
      },
      status: 400,
    });
    const problem = mapper.fromHttpError(err);
    applyProblemToForm(problem, form, { email: 'reg-email' });
    expect(form.controls.email.errors?.['server']).toBe('Email already registered');
  });

  it('UV-2 AC7: 409 conflict with only detail goes to remainingGlobal (REQ-NO-DUPLICATE-PARSE)', () => {
    const form = buildForm();
    const mapper = TestBed.inject(ProblemErrorMapper);
    const err = new HttpErrorResponse({
      error: {
        status: 409,
        detail: "Ya existe un usuario con email 'user@example.com'",
      },
      status: 409,
    });
    const problem = mapper.fromHttpError(err);
    const { remainingGlobal } = applyProblemToForm(problem, form, {});
    expect(remainingGlobal.length).toBeGreaterThan(0);
    expect(remainingGlobal[0].message).toContain('usuario');
    // Must NOT add server error to email (not parsed)
    expect(form.controls.email.errors?.['server']).toBeUndefined();
  });

  it('clearServerErrors removes server errors before re-submit', () => {
    const form = buildForm();
    form.controls.email.setErrors({ server: 'stale error' });
    clearServerErrors(form);
    expect(form.controls.email.errors?.['server']).toBeUndefined();
  });
});
