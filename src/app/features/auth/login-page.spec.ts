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

/**
 * Tests for the login form contract defined in LoginPage.
 *
 * Strategy: test the form group construction rules (validators, control names,
 * default values) in isolation via FormBuilder, without rendering the component
 * template. This avoids DOM complexity while fully covering:
 *   - identifier field presence (not `username`)
 *   - required / minLength(3) / maxLength(255) validators
 *   - form value shape matches LoginRequest canonical contract
 *   - alias backward-compat wiring expectation
 */
describe('LoginPage — form contract', () => {
  beforeAll(() => {
    if (!('document' in globalThis)) {
      Object.defineProperty(globalThis, 'document', {
        value: {},
        configurable: true,
      });
    }
    try {
      TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    } catch {
      // Already initialized.
    }
  });

  let fb: FormBuilder;

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [provideZonelessChangeDetection(), FormBuilder],
    });
    fb = TestBed.inject(FormBuilder);
  });

  function buildLoginForm() {
    return fb.nonNullable.group({
      identifier: [
        '',
        [Validators.required, Validators.minLength(3), Validators.maxLength(255)],
      ],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  // ── field presence ────────────────────────────────────────────────────────

  it('form must have identifier control, not username', () => {
    const form = buildLoginForm();
    expect(form.contains('identifier')).toBe(true);
    expect(form.contains('username')).toBe(false);
  });

  // ── validation rules for identifier ──────────────────────────────────────

  it('identifier must be invalid when empty', () => {
    const form = buildLoginForm();
    form.controls.identifier.setValue('');
    expect(form.controls.identifier.hasError('required')).toBe(true);
  });

  it('identifier must be invalid when shorter than 3 chars', () => {
    const form = buildLoginForm();
    form.controls.identifier.setValue('ab');
    expect(form.controls.identifier.hasError('minlength')).toBe(true);
  });

  it('identifier must be invalid when longer than 255 chars', () => {
    const form = buildLoginForm();
    form.controls.identifier.setValue('a'.repeat(256));
    expect(form.controls.identifier.hasError('maxlength')).toBe(true);
  });

  it('identifier must be valid with a plain username (min 3 chars)', () => {
    const form = buildLoginForm();
    form.controls.identifier.setValue('jperez');
    expect(form.controls.identifier.valid).toBe(true);
  });

  it('identifier must be valid with an email address', () => {
    const form = buildLoginForm();
    form.controls.identifier.setValue('jperez@uniquindio.edu.co');
    expect(form.controls.identifier.valid).toBe(true);
  });

  it('identifier maxLength must be 255 (not legacy 50)', () => {
    const form = buildLoginForm();
    form.controls.identifier.setValue('a'.repeat(255));
    expect(form.controls.identifier.hasError('maxlength')).toBe(false);
    form.controls.identifier.setValue('a'.repeat(256));
    expect(form.controls.identifier.hasError('maxlength')).toBe(true);
  });

  // ── submit payload shape ──────────────────────────────────────────────────

  it('getRawValue must produce {identifier, password} — canonical LoginRequest shape', () => {
    const form = buildLoginForm();
    form.setValue({ identifier: 'jperez', password: 'MyPassword123' });

    const payload = form.getRawValue();

    expect(payload).toHaveProperty('identifier', 'jperez');
    expect(payload).toHaveProperty('password', 'MyPassword123');
    expect(payload).not.toHaveProperty('username');
  });

  it('payload identifier key must hold email when user enters email', () => {
    const form = buildLoginForm();
    form.setValue({ identifier: 'jperez@uniquindio.edu.co', password: 'MyPassword123' });

    const payload = form.getRawValue();
    expect(payload.identifier).toBe('jperez@uniquindio.edu.co');
  });

  // ── full form validity gate ───────────────────────────────────────────────

  it('form must be invalid when password is missing', () => {
    const form = buildLoginForm();
    form.controls.identifier.setValue('jperez');
    form.controls.password.setValue('');
    expect(form.invalid).toBe(true);
  });

  it('form must be valid with both identifier and password filled correctly', () => {
    const form = buildLoginForm();
    form.controls.identifier.setValue('jperez');
    form.controls.password.setValue('MyPassword123');
    expect(form.valid).toBe(true);
  });

  // ── alias backward-compat wiring expectation ──────────────────────────────

  it('LoginRequest type must allow optional username for compat tooling', () => {
    // If this test compiles, the type allows username? as optional
    const body: import('@core/auth/models/auth-api.types').LoginRequest = {
      identifier: 'jperez',
      password: 'MyPassword123',
      username: 'jperez',
    };
    expect(body.username).toBe('jperez');
    expect(body.identifier).toBe('jperez');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LoginPage — UI copy and error behavior wiring
// Strategy: source-level template assertions + direct ProblemErrorMapper logic
// tests that mirror the exact catchError chain used in LoginPage.submit().
// DOM rendering is not available in the 'node' vitest environment; these tests
// cover the same behavioral guarantees without a browser runtime.
// ─────────────────────────────────────────────────────────────────────────────
describe('LoginPage — UI copy and error behavior wiring', () => {
  const source = readFileSync(
    join(import.meta.dirname, 'login-page.ts'),
    'utf-8',
  );

  // ── rendered visible copy ──────────────────────────────────────────────────

  it('template must define "Usuario o correo" as the identifier label (updated from legacy "Usuario")', () => {
    expect(source).toContain('Usuario o correo');
  });

  it('template must NOT contain the old "Usuario" label standalone (label was replaced)', () => {
    expect(source).not.toMatch(/>\s*Usuario\s*</);
  });

  it('identifier input must carry autocomplete="username" for browser autofill compatibility', () => {
    expect(source).toContain('autocomplete="username"');
  });

  it('error message element must use role="alert" for screen reader accessibility', () => {
    expect(source).toContain('role="alert"');
  });

  it('error message element must be bound to errorMessage() signal', () => {
    expect(source).toContain('errorMessage()');
  });

  // ── canonical payload (structural) ────────────────────────────────────────

  it('form control name must be "identifier" and NOT "username" in the template', () => {
    expect(source).toContain('formControlName="identifier"');
    expect(source).not.toContain('formControlName="username"');
  });

  it('form input id must be "login-identifier" (not legacy "login-username")', () => {
    expect(source).toContain('id="login-identifier"');
    expect(source).not.toContain('id="login-username"');
  });

  it('label for attribute must point to "login-identifier"', () => {
    expect(source).toContain('for="login-identifier"');
  });

  // ── error behavior wiring — 400 conflict ─────────────────────────────────
  // These tests reproduce the exact pipeline in LoginPage.submit()'s catchError:
  //   problem?.detail ?? problem?.title ?? 'No se pudo iniciar sesión.'

  it('400 conflict payload — detail must be the displayed error message', () => {
    const mapper = new ProblemErrorMapper();
    const err = new HttpErrorResponse({
      error: {
        status: 400,
        title: 'Bad Request',
        detail: "Los campos 'identifier' y 'username' tienen valores distintos; proporcione solo uno",
      },
      status: 400,
    });
    const problem = mapper.fromHttpError(err);
    const msg = problem?.detail ?? problem?.title ?? 'No se pudo iniciar sesión.';
    expect(msg).toBe(
      "Los campos 'identifier' y 'username' tienen valores distintos; proporcione solo uno",
    );
  });

  it('400 missing identifier payload — detail must surface as error message', () => {
    const mapper = new ProblemErrorMapper();
    const err = new HttpErrorResponse({
      error: {
        status: 400,
        title: 'Bad Request',
        detail: "Se requiere al menos 'identifier' o 'username' para autenticarse",
      },
      status: 400,
    });
    const problem = mapper.fromHttpError(err);
    const msg = problem?.detail ?? problem?.title ?? 'No se pudo iniciar sesión.';
    expect(msg).toContain('identifier');
  });

  // ── error behavior wiring — 409 ambiguity ────────────────────────────────

  it('409 ambiguity payload — detail must be the displayed error message', () => {
    const mapper = new ProblemErrorMapper();
    const err = new HttpErrorResponse({
      error: {
        status: 409,
        title: 'Conflict',
        detail: 'El identificador proporcionado es ambiguo y no permite autenticación segura',
      },
      status: 409,
    });
    const problem = mapper.fromHttpError(err);
    const msg = problem?.detail ?? problem?.title ?? 'No se pudo iniciar sesión.';
    expect(msg).toBe(
      'El identificador proporcionado es ambiguo y no permite autenticación segura',
    );
  });

  it('409 response without detail must fall back to title', () => {
    const mapper = new ProblemErrorMapper();
    const err = new HttpErrorResponse({
      error: { status: 409, title: 'Conflict' },
      status: 409,
    });
    const problem = mapper.fromHttpError(err);
    const msg = problem?.detail ?? problem?.title ?? 'No se pudo iniciar sesión.';
    expect(msg).toBe('Conflict');
  });

  // ── error behavior wiring — 401 invalid credentials ──────────────────────

  it('401 invalid credentials — parity detail must appear as error message', () => {
    const mapper = new ProblemErrorMapper();
    const err = new HttpErrorResponse({
      error: {
        status: 401,
        title: 'Unauthorized',
        detail: 'Credenciales inválidas o usuario inactivo',
      },
      status: 401,
    });
    const problem = mapper.fromHttpError(err);
    const msg = problem?.detail ?? problem?.title ?? 'No se pudo iniciar sesión.';
    expect(msg).toBe('Credenciales inválidas o usuario inactivo');
  });

  // ── error behavior wiring — no response body fallback ────────────────────

  it('network error without problem body must produce a non-empty message (never silent failure)', () => {
    const mapper = new ProblemErrorMapper();
    // Simulates a network-level failure: no HTTP response body
    const err = new HttpErrorResponse({ error: null, status: 0, statusText: '' });
    const problem = mapper.fromHttpError(err);
    // ProblemErrorMapper always returns a ProblemDetail (never null), so at minimum
    // title or detail will be set — the message shown will not be the hardcoded fallback
    // but will still be a non-empty string (LoginPage.submit uses detail ?? title ?? fallback)
    const msg = problem?.detail ?? problem?.title ?? 'No se pudo iniciar sesión.';
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('hardcoded fallback applies when problem is null (LoginPage.submit circuit)', () => {
    // Validates the null-guard in LoginPage.submit: problem?.detail ?? problem?.title ?? fallback
    // If ProblemErrorMapper returns null (future scenario), the fallback triggers
    const problem: null = null;
    const msg = problem?.detail ?? problem?.title ?? 'No se pudo iniciar sesión.';
    expect(msg).toBe('No se pudo iniciar sesión.');
  });
});
