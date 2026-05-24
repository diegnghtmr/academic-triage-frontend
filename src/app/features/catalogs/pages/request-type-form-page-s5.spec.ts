/**
 * S5 additional specs for RequestTypeFormPage — UV-10 compliance.
 * Augments existing request-type-form-page.spec.ts with S5 requirements.
 *
 * Covers:
 *   F. markAllAsTouched() on invalid submit (UV-10 AC2)
 *   G. fieldErrors mapping via applyProblemToForm (UV-10 AC6)
 *   H. Source assertions — at-form-field, at-error-summary, at-character-counter (UV-10 AC3, AC5)
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
import { EMPTY, throwError } from 'rxjs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ProblemErrorMapper } from '@core/http/problem-error.mapper';
import { CatalogAdminApiService } from '../data-access/catalog-admin-api.service';
import { RequestTypeFormPage } from './request-type-form-page';

// ─── source path ─────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SOURCE = readFileSync(join(__dirname, 'request-type-form-page.ts'), 'utf8');

// ─── helpers ──────────────────────────────────────────────────────────────────

function stubRoute(id: string | null): ActivatedRoute {
  return {
    snapshot: { paramMap: { get: (_key: string) => id } },
  } as unknown as ActivatedRoute;
}

interface SetupOptions {
  routeId?: string | null;
  getById?: ReturnType<typeof vi.fn>;
  create?: ReturnType<typeof vi.fn>;
  update?: ReturnType<typeof vi.fn>;
}

function setup(opts: SetupOptions = {}): RequestTypeFormPage {
  const {
    routeId = null,
    getById = vi.fn().mockReturnValue(EMPTY),
    create = vi.fn().mockReturnValue(EMPTY),
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
        provide: CatalogAdminApiService,
        useValue: {
          getRequestTypeById: getById,
          createRequestType: create,
          updateRequestType: update,
        },
      },
      ProblemErrorMapper,
      RequestTypeFormPage,
    ],
  });

  return TestBed.runInInjectionContext(() => new RequestTypeFormPage());
}

// ─── suite ────────────────────────────────────────────────────────────────────

describe('RequestTypeFormPage — S5 UV-10 compliance', () => {
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

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  // ── F. markAllAsTouched on invalid submit (UV-10 AC2) ─────────────────────

  describe('F. markAllAsTouched on invalid submit — UV-10 AC2', () => {
    it('invalid form: name control becomes touched after submit()', () => {
      const page = setup();
      page['form'].controls.name.setValue('');
      expect(page['form'].controls.name.touched).toBe(false);
      page['submit']();
      expect(page['form'].controls.name.touched).toBe(true);
    });

    it('invalid form: createRequestType is NOT called', () => {
      const create = vi.fn().mockReturnValue(EMPTY);
      const page = setup({ create });
      page['form'].controls.name.setValue('');
      page['submit']();
      expect(create).not.toHaveBeenCalled();
    });
  });

  // ── G. fieldErrors mapping (UV-10 AC6) ────────────────────────────────────

  describe('G. fieldErrors backend mapping — UV-10 AC6', () => {
    it('HTTP error with fieldErrors for name: error set on name control', () => {
      const err = new HttpErrorResponse({
        error: {
          status: 422,
          title: 'Validation failed',
          fieldErrors: [{ field: 'name', message: 'Nombre ya existe' }],
        },
        status: 422,
      });
      const create = vi.fn().mockReturnValue(throwError(() => err));
      const page = setup({ create });
      page['form'].setValue({ name: 'Duplicate', description: '' });
      page['submit']();
      expect(page['form'].controls.name.hasError('server')).toBe(true);
    });

    it('HTTP error with detail only: summaryItems contains detail message', () => {
      const err = new HttpErrorResponse({
        error: {
          status: 500,
          title: 'Internal Error',
          detail: 'No pudimos guardar el tipo de solicitud.',
        },
        status: 500,
      });
      const create = vi.fn().mockReturnValue(throwError(() => err));
      const page = setup({ create });
      page['form'].setValue({ name: 'Test', description: '' });
      page['submit']();
      const items = page['summaryItems']();
      expect(items.some((i) => i.message.includes('No pudimos'))).toBe(true);
    });
  });

  // ── H. Source assertions — UV-10 AC3, AC5, AC6 ───────────────────────────

  describe('H. Source assertions — UV-10 AC3, AC5, AC6', () => {
    it('template uses at-form-field for field wrapping (UV-10 AC3)', () => {
      expect(SOURCE).toContain('at-form-field');
    });

    it('template uses at-error-summary for global errors (UV-10 AC6)', () => {
      expect(SOURCE).toContain('at-error-summary');
    });

    it('template uses at-character-counter for description field (UV-10 AC5)', () => {
      expect(SOURCE).toContain('at-character-counter');
    });

    it('imports CharacterCounter component', () => {
      expect(SOURCE).toContain('CharacterCounter');
    });

    it('calls applyProblemToForm in error handler (UV-10 AC6)', () => {
      expect(SOURCE).toContain('applyProblemToForm');
    });

    it('calls clearServerErrors before submit (UV-10 AC6)', () => {
      expect(SOURCE).toContain('clearServerErrors');
    });

    it('calls markAllAsTouched() on invalid submit (UV-10 AC2)', () => {
      expect(SOURCE).toContain('markAllAsTouched');
    });

    it('submit button is NOT disabled by form.invalid alone (UV-1 AC3)', () => {
      expect(SOURCE).not.toMatch(/\[disabled\]="form\.invalid"/);
    });
  });
});
