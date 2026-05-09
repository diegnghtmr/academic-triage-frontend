/**
 * Tests for OriginChannelFormPage.
 *
 * Strategy: instantiate the component class inside TestBed.runInInjectionContext
 * so Angular's injection system wires all dependencies but no DOM rendering occurs.
 * Vitest environment is 'node' — DOM-based rendering is intentionally bypassed;
 * this follows the same pattern used in request-create-page.spec.ts.
 *
 * Covers:
 *   A. Form validation — name: required, maxLength(100)
 *   B. isEdit / channelId detection from route snapshot
 *   C. submit() — create, edit, success navigation, HTTP error, invalid guard
 *   D. loadItem — populates form on success, sets loadError on failure
 */
import '@angular/compiler';
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
import { CatalogAdminApiService } from '../data-access/catalog-admin-api.service';
import { OriginChannelFormPage } from './origin-channel-form-page';

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
  create?: ReturnType<typeof vi.fn>;
  update?: ReturnType<typeof vi.fn>;
}

function setup(opts: SetupOptions = {}): OriginChannelFormPage {
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
          getOriginChannelById: getById,
          createOriginChannel: create,
          updateOriginChannel: update,
        },
      },
      ProblemErrorMapper,
      OriginChannelFormPage,
    ],
  });

  return TestBed.runInInjectionContext(() => new OriginChannelFormPage());
}

// ─── suite ────────────────────────────────────────────────────────────────────

describe('OriginChannelFormPage', () => {
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
    it('name is invalid when empty (required)', () => {
      const page = setup();
      const ctrl = page['form'].controls.name;
      ctrl.setValue('');
      expect(ctrl.hasError('required')).toBe(true);
    });

    it('name is valid when exactly 100 characters', () => {
      const page = setup();
      const ctrl = page['form'].controls.name;
      ctrl.setValue('a'.repeat(100));
      expect(ctrl.valid).toBe(true);
    });

    it('name is invalid when 101 characters (maxLength)', () => {
      const page = setup();
      const ctrl = page['form'].controls.name;
      ctrl.setValue('a'.repeat(101));
      expect(ctrl.hasError('maxlength')).toBe(true);
    });

    it('form is valid when name has a non-empty value within limits', () => {
      const page = setup();
      page['form'].controls.name.setValue('Web Form');
      expect(page['form'].valid).toBe(true);
    });
  });

  // ── B. isEdit / channelId ──────────────────────────────────────────────────

  describe('B. isEdit / channelId behavior', () => {
    it('without route id → isEdit() is false', () => {
      const page = setup({ routeId: null });
      expect(page['isEdit']()).toBe(false);
    });

    it('without route id → getOriginChannelById is NOT called', () => {
      const getById = vi.fn().mockReturnValue(EMPTY);
      setup({ routeId: null, getById });
      expect(getById).not.toHaveBeenCalled();
    });

    it('with route id=7 → isEdit() is true', () => {
      const getById = vi.fn().mockReturnValue(EMPTY);
      const page = setup({ routeId: '7', getById });
      expect(page['isEdit']()).toBe(true);
    });

    it('with route id=7 → getOriginChannelById called with 7', () => {
      const getById = vi.fn().mockReturnValue(EMPTY);
      setup({ routeId: '7', getById });
      expect(getById).toHaveBeenCalledWith(7);
    });
  });

  // ── C. submit() flow ───────────────────────────────────────────────────────

  describe('C. submit() flow', () => {
    it('create mode: calls createOriginChannel with trimmed name', () => {
      const create = vi.fn().mockReturnValue(of({ id: 1, name: 'Email', active: true }));
      const page = setup({ create });
      page['form'].controls.name.setValue('  Email  ');
      page['submit']();
      expect(create).toHaveBeenCalledWith({ name: 'Email' });
    });

    it('edit mode: calls updateOriginChannel with id and body', () => {
      const getById = vi.fn().mockReturnValue(of({ id: 7, name: 'Old', active: true }));
      const update = vi.fn().mockReturnValue(of({ id: 7, name: 'New Name', active: true }));
      const page = setup({ routeId: '7', getById, update });
      page['form'].controls.name.setValue('New Name');
      page['submit']();
      expect(update).toHaveBeenCalledWith(7, { name: 'New Name' });
    });

    it('on success: navigates to /app/catalogs/origin-channels', () => {
      const create = vi.fn().mockReturnValue(of({ id: 1, name: 'Email', active: true }));
      const page = setup({ create });
      const router = TestBed.inject(Router);
      page['form'].controls.name.setValue('Email');
      page['submit']();
      expect(router.navigate).toHaveBeenCalledWith(['/app/catalogs/origin-channels']);
    });

    it('on HTTP error: sets submitError from problem.detail', () => {
      const err = new HttpErrorResponse({
        error: { status: 422, title: 'Unprocessable', detail: 'Name already taken' },
        status: 422,
      });
      const create = vi.fn().mockReturnValue(throwError(() => err));
      const page = setup({ create });
      page['form'].controls.name.setValue('Duplicate');
      page['submit']();
      expect(page['submitError']()).toBe('Name already taken');
    });

    it('invalid form → createOriginChannel is NOT called', () => {
      const create = vi.fn().mockReturnValue(EMPTY);
      const page = setup({ create });
      // form is invalid because name is empty (required)
      page['form'].controls.name.setValue('');
      page['submit']();
      expect(create).not.toHaveBeenCalled();
    });

    it('invalid form → updateOriginChannel is NOT called', () => {
      const getById = vi.fn().mockReturnValue(EMPTY);
      const update = vi.fn().mockReturnValue(EMPTY);
      const page = setup({ routeId: '7', getById, update });
      page['form'].controls.name.setValue('');
      page['submit']();
      expect(update).not.toHaveBeenCalled();
    });
  });

  // ── D. loadItem ────────────────────────────────────────────────────────────

  describe('D. loadItem', () => {
    it('populates form.name from response', () => {
      const getById = vi.fn().mockReturnValue(of({ id: 7, name: 'Web Portal', active: true }));
      const page = setup({ routeId: '7', getById });
      expect(page['form'].controls.name.value).toBe('Web Portal');
    });

    it('on error: sets loadError from problem.detail', () => {
      const err = new HttpErrorResponse({
        error: { status: 404, title: 'Not Found', detail: 'Channel not found' },
        status: 404,
      });
      const getById = vi.fn().mockReturnValue(throwError(() => err));
      const page = setup({ routeId: '7', getById });
      expect(page['loadError']()).toBe('Channel not found');
    });

    it('on error without detail: falls back to title', () => {
      const err = new HttpErrorResponse({
        error: { status: 404, title: 'Not Found' },
        status: 404,
      });
      const getById = vi.fn().mockReturnValue(throwError(() => err));
      const page = setup({ routeId: '7', getById });
      expect(page['loadError']()).toBe('Not Found');
    });
  });
});
