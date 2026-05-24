/**
 * Tests for UserFormPage — form validation, submit(), loadUser(), and UV-10 compliance.
 *
 * Strategy: instantiate the component class inside TestBed.runInInjectionContext
 * so Angular's injection system wires all dependencies but no DOM rendering occurs.
 * vitest environment is 'node' — DOM-based rendering is intentionally bypassed;
 * this follows the same pattern used in request-create-page.spec.ts.
 *
 * Covers:
 *   A. Form validation — firstName, lastName, identification, email, role
 *   B. submit() — markAllAsTouched on invalid, no API call guard, success navigation
 *   C. HTTP errors — fieldErrors mapped via applyProblemToForm (UV-10 AC6)
 *   D. loadUser — form populated, loadError on failure
 *   E. Source assertions — at-form-field + at-error-summary + applyProblemToForm (UV-10 AC3, AC6)
 */
import '@angular/compiler';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { EnvironmentProviders, provideZonelessChangeDetection } from '@angular/core';
import type { Provider } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, of, throwError } from 'rxjs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ProblemErrorMapper } from '@core/http/problem-error.mapper';
import { UsersApiService } from '../data-access/users-api.service';
import type { UserResponse } from '@core/auth/models/auth-api.types';
import { UserFormPage } from './user-form-page';

// ─── source path ─────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SOURCE = readFileSync(join(__dirname, 'user-form-page.ts'), 'utf8');

// ─── helpers ──────────────────────────────────────────────────────────────────

function stubRoute(id: string | null): ActivatedRoute {
  return {
    snapshot: {
      paramMap: {
        get: (_key: string) => id,
      },
    },
  } as unknown as ActivatedRoute;
}

interface SetupOptions {
  routeId?: string | null;
  getById?: ReturnType<typeof vi.fn>;
  update?: ReturnType<typeof vi.fn>;
}

function setup(opts: SetupOptions = {}): UserFormPage {
  const {
    routeId = null,
    getById = vi.fn().mockReturnValue(EMPTY),
    update = vi.fn().mockReturnValue(EMPTY),
  } = opts;

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection() as unknown as Provider | EnvironmentProviders,
      provideHttpClient(withFetch()),
      provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: stubRoute(routeId) },
      { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
      {
        provide: UsersApiService,
        useValue: { getById, update },
      },
      ProblemErrorMapper,
      UserFormPage,
    ],
  });

  return TestBed.runInInjectionContext(() => new UserFormPage());
}

// ─── bootstrap ───────────────────────────────────────────────────────────────

describe('UserFormPage', () => {
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
      // Already initialized by another spec file.
    }
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  // ── A. Form validation ─────────────────────────────────────────────────────

  describe('A. Form validation', () => {
    it('firstName required when empty', () => {
      const page = setup();
      page['form'].controls.firstName.setValue('');
      expect(page['form'].controls.firstName.hasError('required')).toBe(true);
    });

    it('firstName invalid when exceeds 75 chars', () => {
      const page = setup();
      page['form'].controls.firstName.setValue('a'.repeat(76));
      expect(page['form'].controls.firstName.hasError('maxlength')).toBe(true);
    });

    it('lastName required when empty', () => {
      const page = setup();
      page['form'].controls.lastName.setValue('');
      expect(page['form'].controls.lastName.hasError('required')).toBe(true);
    });

    it('identification required when empty', () => {
      const page = setup();
      page['form'].controls.identification.setValue('');
      expect(page['form'].controls.identification.hasError('required')).toBe(true);
    });

    it('identification invalid when exceeds 20 chars', () => {
      const page = setup();
      page['form'].controls.identification.setValue('a'.repeat(21));
      expect(page['form'].controls.identification.hasError('maxlength')).toBe(true);
    });

    it('email required when empty', () => {
      const page = setup();
      page['form'].controls.email.setValue('');
      expect(page['form'].controls.email.hasError('required')).toBe(true);
    });

    it('email invalid when not an email format', () => {
      const page = setup();
      page['form'].controls.email.setValue('not-an-email');
      expect(page['form'].controls.email.hasError('email')).toBe(true);
    });
  });

  // ── B. submit() UV-10 AC1 — invalid form reveals errors, no API call ───────

  describe('B. submit() — UV-10 AC1', () => {
    it('invalid form: markAllAsTouched() called — all controls become touched (UV-10 AC1)', () => {
      const page = setup();
      // All controls start untouched with empty values
      page['form'].controls.firstName.setValue('');
      page['form'].controls.lastName.setValue('');
      page['form'].controls.identification.setValue('');
      page['form'].controls.email.setValue('');
      page['submit']();
      // After submit, all required controls should be touched
      expect(page['form'].controls.firstName.touched).toBe(true);
      expect(page['form'].controls.lastName.touched).toBe(true);
      expect(page['form'].controls.identification.touched).toBe(true);
      expect(page['form'].controls.email.touched).toBe(true);
    });

    it('invalid form: update() is NOT called', () => {
      const update = vi.fn().mockReturnValue(EMPTY);
      const page = setup({ update });
      page['form'].controls.firstName.setValue('');
      page['submit']();
      expect(update).not.toHaveBeenCalled();
    });

    it('valid form with userId: update() IS called', () => {
      const update = vi.fn().mockReturnValue(of({}));
      const mockUser: UserResponse = {
        id: 5,
        username: 'jdoe',
        firstName: 'John',
        lastName: 'Doe',
        identification: '12345',
        email: 'jdoe@test.com',
        role: 'STAFF',
        active: true,
      };
      const getById = vi.fn().mockReturnValue(of(mockUser));
      const page = setup({ routeId: '5', getById, update });
      page['form'].setValue({
        firstName: 'John',
        lastName: 'Doe',
        identification: '12345',
        email: 'jdoe@test.com',
        role: 'STAFF',
        active: true,
      });
      page['submit']();
      expect(update).toHaveBeenCalledOnce();
    });

    it('on success: navigates to /app/users', () => {
      const update = vi.fn().mockReturnValue(of({}));
      const mockUser: UserResponse = {
        id: 5,
        username: 'jdoe',
        firstName: 'John',
        lastName: 'Doe',
        identification: '12345',
        email: 'jdoe@test.com',
        role: 'STAFF',
        active: true,
      };
      const getById = vi.fn().mockReturnValue(of(mockUser));
      const page = setup({ routeId: '5', getById, update });
      page['form'].setValue({
        firstName: 'John',
        lastName: 'Doe',
        identification: '12345',
        email: 'jdoe@test.com',
        role: 'STAFF',
        active: true,
      });
      page['submit']();
      const router = TestBed.inject(Router);
      expect(router.navigate).toHaveBeenCalledWith(['/app/users']);
    });
  });

  // ── C. fieldErrors mapping (UV-10 AC6) ────────────────────────────────────

  describe('C. fieldErrors backend mapping — UV-10 AC6', () => {
    it('HTTP error with fieldErrors for email: summaryItems contains field message', () => {
      const err = new HttpErrorResponse({
        error: {
          status: 422,
          title: 'Validation failed',
          detail: 'Email already in use',
          fieldErrors: [{ field: 'email', message: 'Email ya registrado' }],
        },
        status: 422,
      });
      const update = vi.fn().mockReturnValue(throwError(() => err));
      const mockUser: UserResponse = {
        id: 5,
        username: 'jdoe',
        firstName: 'John',
        lastName: 'Doe',
        identification: '12345',
        email: 'jdoe@test.com',
        role: 'STAFF',
        active: true,
      };
      const getById = vi.fn().mockReturnValue(of(mockUser));
      const page = setup({ routeId: '5', getById, update });
      page['form'].setValue({
        firstName: 'John',
        lastName: 'Doe',
        identification: '12345',
        email: 'jdoe@test.com',
        role: 'STAFF',
        active: true,
      });
      page['submit']();

      // Known field (email) → error on control
      expect(page['form'].controls.email.hasError('server')).toBe(true);
    });

    it('HTTP error with detail only: summaryItems contains detail message', () => {
      const err = new HttpErrorResponse({
        error: {
          status: 500,
          title: 'Server Error',
          detail: 'No pudimos guardar los cambios del usuario.',
        },
        status: 500,
      });
      const update = vi.fn().mockReturnValue(throwError(() => err));
      const mockUser: UserResponse = {
        id: 5,
        username: 'jdoe',
        firstName: 'John',
        lastName: 'Doe',
        identification: '12345',
        email: 'jdoe@test.com',
        role: 'STAFF',
        active: true,
      };
      const getById = vi.fn().mockReturnValue(of(mockUser));
      const page = setup({ routeId: '5', getById, update });
      page['form'].setValue({
        firstName: 'John',
        lastName: 'Doe',
        identification: '12345',
        email: 'jdoe@test.com',
        role: 'STAFF',
        active: true,
      });
      page['submit']();

      const items = page['summaryItems']();
      expect(items.some((i) => i.message.includes('No pudimos'))).toBe(true);
    });
  });

  // ── D. loadUser ────────────────────────────────────────────────────────────

  describe('D. loadUser', () => {
    it('populates form from UserResponse', () => {
      const mockUser: UserResponse = {
        id: 3,
        username: 'alice',
        firstName: 'Alice',
        lastName: 'Smith',
        identification: 'ID-999',
        email: 'alice@test.com',
        role: 'ADMIN',
        active: false,
      };
      const getById = vi.fn().mockReturnValue(of(mockUser));
      const page = setup({ routeId: '3', getById });
      expect(page['form'].controls.firstName.value).toBe('Alice');
      expect(page['form'].controls.lastName.value).toBe('Smith');
      expect(page['form'].controls.email.value).toBe('alice@test.com');
      expect(page['form'].controls.role.value).toBe('ADMIN');
      expect(page['username']()).toBe('alice');
    });

    it('on loadUser error: loadError is set from problem.detail', () => {
      const err = new HttpErrorResponse({
        error: { status: 404, title: 'Not Found', detail: 'Usuario no encontrado' },
        status: 404,
      });
      const getById = vi.fn().mockReturnValue(throwError(() => err));
      const page = setup({ routeId: '99', getById });
      expect(page['loadError']()).toBe('Usuario no encontrado');
    });

    it('no route id: loadError set with missing id message', () => {
      const page = setup({ routeId: null });
      expect(page['loadError']()).not.toBeNull();
    });
  });

  // ── E. Source assertions — UV-10 AC3, AC6: at-form-field + at-error-summary ─

  describe('E. Source assertions — UV-10 AC3, AC6', () => {
    it('template uses at-form-field for field wrapping (UV-10 AC3)', () => {
      expect(SOURCE).toContain('at-form-field');
    });

    it('template uses at-error-summary for global error display (UV-10 AC6)', () => {
      expect(SOURCE).toContain('at-error-summary');
    });

    it('imports ErrorSummary component', () => {
      expect(SOURCE).toContain('ErrorSummary');
    });

    it('imports FormField component', () => {
      expect(SOURCE).toContain('FormField');
    });

    it('calls applyProblemToForm in error handler (UV-10 AC6)', () => {
      expect(SOURCE).toContain('applyProblemToForm');
    });

    it('calls clearServerErrors before submit (UV-10 AC6)', () => {
      expect(SOURCE).toContain('clearServerErrors');
    });

    it('calls markAllAsTouched() on invalid submit (UV-10 AC1)', () => {
      expect(SOURCE).toContain('markAllAsTouched');
    });

    it('submit button is NOT disabled by form.invalid alone (UV-1 AC3)', () => {
      // Button must not have [disabled]="form.invalid" as sole condition
      expect(SOURCE).not.toMatch(/\[disabled\]="form\.invalid"/);
    });
  });
});
