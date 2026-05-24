/**
 * Tests for RequestTypeFormPage — form validation, isEdit/typeId, submit(), and loadItem().
 *
 * Strategy: instantiate the component class inside TestBed.runInInjectionContext
 * so Angular's injection system wires all dependencies but no DOM rendering occurs.
 * vitest environment is 'node' — DOM-based rendering is intentionally bypassed;
 * this follows the same pattern used in request-create-page.spec.ts.
 */
import '@angular/compiler';
import { EnvironmentProviders, provideZonelessChangeDetection } from '@angular/core';
import type { Provider } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideRouter } from '@angular/router';
import { EMPTY, of, throwError } from 'rxjs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { CatalogAdminApiService } from '../data-access/catalog-admin-api.service';
import type { RequestTypeResponse } from '../models/catalog-admin.types';
import { RequestTypeFormPage } from './request-type-form-page';

// ─── internal shape exposed via unknown cast ──────────────────────────────────

type PageInternals = {
  form: RequestTypeFormPage['form'];
  isEdit: () => boolean;
  loadError: () => string | null;
  summaryItems: () => readonly { field: string | null; message: string; controlId?: string }[];
  submitting: () => boolean;
  submit: () => void;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeStubRoute(id: string | null) {
  return {
    snapshot: {
      paramMap: {
        get: (key: string) => (key === 'id' ? id : null),
      },
    },
  };
}

// ─── suite ────────────────────────────────────────────────────────────────────

describe('RequestTypeFormPage', () => {
  let navigateSpy: ReturnType<typeof vi.fn>;
  let getRequestTypeById: ReturnType<typeof vi.fn>;
  let createRequestType: ReturnType<typeof vi.fn>;
  let updateRequestType: ReturnType<typeof vi.fn>;

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

  interface SetupOptions {
    routeId?: string | null;
    navigateFn?: ReturnType<typeof vi.fn>;
    getById?: ReturnType<typeof vi.fn>;
    create?: ReturnType<typeof vi.fn>;
    update?: ReturnType<typeof vi.fn>;
  }

  function setup(options: SetupOptions | string | null = null): RequestTypeFormPage {
    // Accept a bare routeId string/null for convenience (existing call sites)
    const opts: SetupOptions =
      options === null || typeof options === 'string' ? { routeId: options } : options;

    const routeId = opts.routeId ?? null;
    navigateSpy = opts.navigateFn ?? vi.fn().mockResolvedValue(true);
    getRequestTypeById = opts.getById ?? vi.fn().mockReturnValue(EMPTY);
    createRequestType = opts.create ?? vi.fn().mockReturnValue(EMPTY);
    updateRequestType = opts.update ?? vi.fn().mockReturnValue(EMPTY);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection() as unknown as Provider | EnvironmentProviders,
        provideHttpClient(withFetch()),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          provide: (require('@angular/router') as { ActivatedRoute: unknown }).ActivatedRoute,
          useValue: makeStubRoute(routeId),
        },
        {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          provide: (require('@angular/router') as { Router: unknown }).Router,
          useValue: { navigate: navigateSpy },
        },
        {
          provide: CatalogAdminApiService,
          useValue: { getRequestTypeById, createRequestType, updateRequestType },
        },
        RequestTypeFormPage,
      ],
    });

    return TestBed.runInInjectionContext(() => new RequestTypeFormPage());
  }

  // ── A. Form validation ────────────────────────────────────────────────────

  it('A1: name — invalid when empty', () => {
    const page = setup();
    const ctrl = page['form'].controls.name;
    ctrl.setValue('');
    expect(ctrl.invalid).toBe(true);
    expect(ctrl.hasError('required')).toBe(true);
  });

  it('A2: name — valid with exactly 100 chars', () => {
    const page = setup();
    const ctrl = page['form'].controls.name;
    ctrl.setValue('a'.repeat(100));
    expect(ctrl.valid).toBe(true);
  });

  it('A3: name — invalid at 101 chars (maxLength exceeded)', () => {
    const page = setup();
    const ctrl = page['form'].controls.name;
    ctrl.setValue('a'.repeat(101));
    expect(ctrl.invalid).toBe(true);
    expect(ctrl.hasError('maxlength')).toBe(true);
  });

  it('A4: description — valid when empty (optional field)', () => {
    const page = setup();
    const ctrl = page['form'].controls.description;
    ctrl.setValue('');
    expect(ctrl.valid).toBe(true);
  });

  it('A5: description — valid at exactly 500 chars', () => {
    const page = setup();
    const ctrl = page['form'].controls.description;
    ctrl.setValue('x'.repeat(500));
    expect(ctrl.valid).toBe(true);
  });

  it('A6: description — invalid at 501 chars (maxLength exceeded)', () => {
    const page = setup();
    const ctrl = page['form'].controls.description;
    ctrl.setValue('x'.repeat(501));
    expect(ctrl.invalid).toBe(true);
    expect(ctrl.hasError('maxlength')).toBe(true);
  });

  // ── B. isEdit / typeId behavior ───────────────────────────────────────────

  it('B1: without route param id — isEdit() is false', () => {
    const page = setup(null);
    const internals = page as unknown as PageInternals;
    expect(internals.isEdit()).toBe(false);
  });

  it('B2: with route param id=42 — isEdit() is true', () => {
    const page = setup('42');
    const internals = page as unknown as PageInternals;
    expect(internals.isEdit()).toBe(true);
  });

  it('B3: with route param id=42 — getRequestTypeById called with 42', () => {
    setup('42');
    expect(getRequestTypeById).toHaveBeenCalledWith(42);
  });

  it('B4: without route param — getRequestTypeById is NOT called', () => {
    setup(null);
    expect(getRequestTypeById).not.toHaveBeenCalled();
  });

  // ── C. submit() flow ──────────────────────────────────────────────────────

  it('C1: create mode — calls createRequestType with name (description omitted when blank)', () => {
    const create = vi.fn().mockReturnValue(of({} as RequestTypeResponse));
    const page = setup({ routeId: null, create });
    page['form'].setValue({ name: 'Test Type', description: '' });
    (page as unknown as PageInternals).submit();

    expect(createRequestType).toHaveBeenCalledOnce();
    const [body] = createRequestType.mock.calls[0] as [{ name: string; description?: string }];
    expect(body.name).toBe('Test Type');
    expect('description' in body).toBe(false);
  });

  it('C2: create mode — description is trimmed and included when non-blank', () => {
    const create = vi.fn().mockReturnValue(of({} as RequestTypeResponse));
    const page = setup({ routeId: null, create });
    page['form'].setValue({ name: 'Test Type', description: '  some desc  ' });
    (page as unknown as PageInternals).submit();

    const [body] = createRequestType.mock.calls[0] as [{ name: string; description?: string }];
    expect(body.description).toBe('some desc');
  });

  it('C3: edit mode — calls updateRequestType(id, body)', () => {
    const update = vi.fn().mockReturnValue(of({} as RequestTypeResponse));
    const page = setup({ routeId: '42', update });
    page['form'].setValue({ name: 'Updated Name', description: '' });
    (page as unknown as PageInternals).submit();

    expect(updateRequestType).toHaveBeenCalledOnce();
    const [id, body] = updateRequestType.mock.calls[0] as [
      number,
      { name: string; description?: string },
    ];
    expect(id).toBe(42);
    expect(body.name).toBe('Updated Name');
  });

  it('C4: on success — navigates to /app/catalogs/request-types', () => {
    const create = vi.fn().mockReturnValue(of({} as RequestTypeResponse));
    const page = setup({ routeId: null, create });
    page['form'].setValue({ name: 'Nav Test', description: '' });
    (page as unknown as PageInternals).submit();

    expect(navigateSpy).toHaveBeenCalledWith(['/app/catalogs/request-types']);
  });

  it('C5: on HTTP error — summaryItems contains detail from problem', () => {
    const errorResponse = new HttpErrorResponse({
      error: { status: 500, title: 'Internal Error', detail: 'Database is down' },
      status: 500,
    });
    const create = vi.fn().mockReturnValue(throwError(() => errorResponse));
    const page = setup({ routeId: null, create });
    page['form'].setValue({ name: 'Error Test', description: '' });
    (page as unknown as PageInternals).submit();

    const items = page['summaryItems']();
    expect(items.some((i: { message: string }) => i.message.includes('Database is down'))).toBe(
      true,
    );
  });

  it('C6: submit() is a no-op when form is invalid — no API call', () => {
    const page = setup(null);
    // name is empty → form is invalid
    page['form'].setValue({ name: '', description: '' });
    (page as unknown as PageInternals).submit();

    expect(createRequestType).not.toHaveBeenCalled();
    expect(updateRequestType).not.toHaveBeenCalled();
  });

  // ── D. loadItem ───────────────────────────────────────────────────────────

  it('D1: loadItem — sets form.name and form.description from response', () => {
    const mockItem: RequestTypeResponse = {
      id: 42,
      name: 'Loaded Name',
      description: 'Loaded Desc',
      active: true,
    };
    const getById = vi.fn().mockReturnValue(of(mockItem));
    const page = setup({ routeId: '42', getById });

    expect(page['form'].controls.name.value).toBe('Loaded Name');
    expect(page['form'].controls.description.value).toBe('Loaded Desc');
  });

  it('D2: loadItem — sets form.description to empty string when response has no description', () => {
    const mockItem = { id: 42, name: 'No Desc', active: true } as RequestTypeResponse;
    const getById = vi.fn().mockReturnValue(of(mockItem));
    const page = setup({ routeId: '42', getById });

    expect(page['form'].controls.name.value).toBe('No Desc');
    expect(page['form'].controls.description.value).toBe('');
  });

  it('D3: loadItem on error — sets loadError', () => {
    const errorResponse = new HttpErrorResponse({
      error: { status: 404, title: 'Not Found', detail: 'Type not found' },
      status: 404,
    });
    const getById = vi.fn().mockReturnValue(throwError(() => errorResponse));
    const page = setup({ routeId: '99', getById });

    expect((page as unknown as PageInternals).loadError()).toBe('Type not found');
  });
});
