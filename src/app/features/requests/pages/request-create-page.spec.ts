/**
 * Tests for RequestCreatePage.
 *
 * Strategy: instantiate the component class inside TestBed.runInInjectionContext
 * so Angular's injection system wires all dependencies but no DOM rendering occurs.
 * vitest environment is 'node' — DOM-based rendering is intentionally bypassed;
 * this follows the same pattern used in auth.guard.spec.ts and role.guard.spec.ts.
 */
import '@angular/compiler';
import { HttpErrorResponse } from '@angular/common/http';
import { EnvironmentProviders, provideZonelessChangeDetection, signal } from '@angular/core';
import type { Provider, WritableSignal } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideRouter, Router } from '@angular/router';
import { EMPTY, of, throwError } from 'rxjs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AuthSessionStore } from '@core/auth/auth-session.store';
import type { RoleEnum } from '@core/auth/models/auth-api.types';
import { AiApiService } from '../data-access/ai-api.service';
import { CatalogApiService } from '../data-access/catalog-api.service';
import { RequestsApiService } from '../data-access/requests-api.service';
import type { AiClassificationResponse } from '../models/ai-api.types';
import type { OriginChannelResponse, RequestTypeResponse } from '../models/request-api.types';
import { RequestCreatePage } from './request-create-page';

// ---------------------------------------------------------------------------
// Shared test-environment bootstrap (runs once per file)
// ---------------------------------------------------------------------------

function bootstrapTestEnv(): void {
  if (!('document' in globalThis)) {
    Object.defineProperty(globalThis, 'document', { value: {}, configurable: true });
  }
  try {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  } catch {
    // Already initialized by another spec file — ignore.
  }
}

// ---------------------------------------------------------------------------
// Shared setup helper
// ---------------------------------------------------------------------------

interface SetupOptions {
  role?: RoleEnum;
  channels?: OriginChannelResponse[];
  types?: RequestTypeResponse[];
  createRequest?: ReturnType<typeof vi.fn>;
  suggestClassification?: ReturnType<typeof vi.fn>;
  catalogError?: boolean;
  /** Pre-built router mock — pass when you need to assert navigation calls. */
  routerMock?: { navigate: ReturnType<typeof vi.fn> };
}

function buildSetup(opts: SetupOptions = {}): {
  page: RequestCreatePage;
  roleSig: WritableSignal<RoleEnum | null>;
  createRequestMock: ReturnType<typeof vi.fn>;
  suggestClassificationMock: ReturnType<typeof vi.fn>;
} {
  const roleSig = signal<RoleEnum | null>(opts.role ?? 'STAFF');
  const channels = opts.channels ?? [];
  const types = opts.types ?? [];

  const catalogHttpErr = new HttpErrorResponse({
    status: 500,
    statusText: 'Error',
    error: { title: 'Catalog failure', detail: 'Could not load catalog.' },
  });

  const listOriginChannels = opts.catalogError
    ? vi.fn().mockReturnValue(throwError(() => catalogHttpErr))
    : vi.fn().mockReturnValue(of(channels));

  const listRequestTypes = opts.catalogError
    ? vi.fn().mockReturnValue(throwError(() => catalogHttpErr))
    : vi.fn().mockReturnValue(of(types));

  const createRequestMock = opts.createRequest ?? vi.fn().mockReturnValue(EMPTY);
  const suggestClassificationMock = opts.suggestClassification ?? vi.fn().mockReturnValue(EMPTY);

  // When a routerMock is provided, skip provideRouter() and inject the mock directly.
  // This prevents the Angular router from trying to resolve routes and throwing
  // NG04002 unhandled rejections in the node test environment.
  const routerProviders: (Provider | EnvironmentProviders)[] = opts.routerMock
    ? [{ provide: Router, useValue: opts.routerMock }]
    : [provideRouter([])];

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection() as unknown as Provider | EnvironmentProviders,
      provideHttpClient(withFetch()),
      provideHttpClientTesting(),
      ...routerProviders,
      {
        provide: AuthSessionStore,
        useValue: { role: roleSig.asReadonly() },
      },
      {
        provide: CatalogApiService,
        useValue: { listOriginChannels, listRequestTypes },
      },
      {
        provide: RequestsApiService,
        useValue: { createRequest: createRequestMock },
      },
      {
        provide: AiApiService,
        useValue: { suggestClassification: suggestClassificationMock },
      },
      RequestCreatePage,
    ],
  });

  const page = TestBed.runInInjectionContext(() => new RequestCreatePage());
  return { page, roleSig, createRequestMock, suggestClassificationMock };
}

// ---------------------------------------------------------------------------
// Suite 1 — original tests (preserved)
// ---------------------------------------------------------------------------

describe('RequestCreatePage — assignStudentDefaultChannel', () => {
  beforeAll(bootstrapTestEnv);
  afterEach(() => TestBed.resetTestingModule());

  it('STUDENT + matching "Sistema Web" channel → sets originChannelId', () => {
    const { page } = buildSetup({
      role: 'STUDENT',
      channels: [
        { id: 7, name: 'Email', active: true },
        { id: 9, name: 'Sistema Web', active: true },
      ],
    });
    const c = page['form'].controls.originChannelId;
    expect(c.value).toBe(9);
    expect(c.errors).toBeNull();
  });

  it('STUDENT + no matching channel → originChannelId stays null and required error', () => {
    const { page } = buildSetup({
      role: 'STUDENT',
      channels: [
        { id: 7, name: 'Email', active: true },
        { id: 8, name: 'Phone', active: true },
      ],
    });
    const c = page['form'].controls.originChannelId;
    expect(c.value).toBeNull();
    expect(c.errors).toEqual({ required: true });
  });

  it('non-STUDENT (STAFF) → no auto-assign regardless of channels', () => {
    const { page } = buildSetup({
      role: 'STAFF',
      channels: [{ id: 9, name: 'Sistema Web', active: true }],
    });
    const c = page['form'].controls.originChannelId;
    expect(c.value).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — Form validation
// ---------------------------------------------------------------------------

describe('RequestCreatePage — form validation', () => {
  beforeAll(bootstrapTestEnv);
  afterEach(() => TestBed.resetTestingModule());

  it('requestTypeId: null → required error', () => {
    const { page } = buildSetup();
    const c = page['form'].controls.requestTypeId;
    c.setValue(null);
    expect(c.errors).toEqual({ required: true });
  });

  it('requestTypeId: numeric value → no error', () => {
    const { page } = buildSetup();
    const c = page['form'].controls.requestTypeId;
    c.setValue(1);
    expect(c.errors).toBeNull();
  });

  it('originChannelId: null → required error', () => {
    const { page } = buildSetup();
    const c = page['form'].controls.originChannelId;
    c.setValue(null);
    expect(c.errors).toEqual({ required: true });
  });

  it('description: empty → required error', () => {
    const { page } = buildSetup();
    const c = page['form'].controls.description;
    c.setValue('');
    expect(c.errors).toMatchObject({ required: true });
  });

  it('description: < 10 chars → minlength error', () => {
    const { page } = buildSetup();
    const c = page['form'].controls.description;
    c.setValue('short');
    expect(c.errors).toMatchObject({ minlength: expect.anything() });
  });

  it('description: > 2000 chars → maxlength error', () => {
    const { page } = buildSetup();
    const c = page['form'].controls.description;
    c.setValue('a'.repeat(2001));
    expect(c.errors).toMatchObject({ maxlength: expect.anything() });
  });

  it('description: exactly 10 chars → valid', () => {
    const { page } = buildSetup();
    const c = page['form'].controls.description;
    c.setValue('1234567890');
    expect(c.errors).toBeNull();
  });

  it('deadline: optional — empty string leaves form valid when other fields are set', () => {
    const { page } = buildSetup({ channels: [{ id: 1, name: 'Email', active: true }] });
    const f = page['form'];
    f.controls.requestTypeId.setValue(1);
    f.controls.originChannelId.setValue(1);
    f.controls.description.setValue('Valid description text here');
    f.controls.deadline.setValue('');
    expect(f.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — submit()
// ---------------------------------------------------------------------------

describe('RequestCreatePage — submit()', () => {
  beforeAll(bootstrapTestEnv);
  afterEach(() => TestBed.resetTestingModule());

  function fillValidForm(page: RequestCreatePage, deadline = ''): void {
    page['form'].controls.requestTypeId.setValue(3);
    page['form'].controls.originChannelId.setValue(5);
    page['form'].controls.description.setValue('This is a valid description');
    page['form'].controls.deadline.setValue(deadline);
  }

  it('invalid form → createRequest is NOT called', () => {
    const { page, createRequestMock } = buildSetup();
    // form is invalid by default (required fields empty)
    page['submit']();
    expect(createRequestMock).not.toHaveBeenCalled();
  });

  it('valid form without deadline → body omits deadline field', () => {
    const navigateMock = vi.fn().mockResolvedValue(true);
    const createRequestMock = vi.fn().mockReturnValue(of({ id: 42 }));
    const { page } = buildSetup({
      createRequest: createRequestMock,
      routerMock: { navigate: navigateMock },
    });
    fillValidForm(page);

    page['submit']();

    expect(createRequestMock).toHaveBeenCalledWith({
      requestTypeId: 3,
      originChannelId: 5,
      description: 'This is a valid description',
    });
    expect(createRequestMock.mock.calls[0][0]).not.toHaveProperty('deadline');
  });

  it('valid form with deadline → body includes deadline', () => {
    const navigateMock = vi.fn().mockResolvedValue(true);
    const createRequestMock = vi.fn().mockReturnValue(of({ id: 42 }));
    const { page } = buildSetup({
      createRequest: createRequestMock,
      routerMock: { navigate: navigateMock },
    });
    fillValidForm(page, '2026-12-31');

    page['submit']();

    expect(createRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({ deadline: '2026-12-31' }),
    );
  });

  it('success with id → navigates to /app/requests/:id', () => {
    const navigateMock = vi.fn().mockResolvedValue(true);
    const createRequestMock = vi.fn().mockReturnValue(of({ id: 42 }));
    const { page } = buildSetup({
      createRequest: createRequestMock,
      routerMock: { navigate: navigateMock },
    });
    fillValidForm(page);

    page['submit']();

    expect(navigateMock).toHaveBeenCalledWith(['/app/requests', 42]);
  });

  it('success without id → navigates to /app/requests/list', () => {
    const navigateMock = vi.fn().mockResolvedValue(true);
    const createRequestMock = vi.fn().mockReturnValue(of({}));
    const { page } = buildSetup({
      createRequest: createRequestMock,
      routerMock: { navigate: navigateMock },
    });
    fillValidForm(page);

    page['submit']();

    expect(navigateMock).toHaveBeenCalledWith(['/app/requests/list']);
  });

  it('HTTP error → errorMessage set from problem.detail; submitting reverts to false', () => {
    const httpErr = new HttpErrorResponse({
      status: 422,
      statusText: 'Unprocessable Entity',
      error: { title: 'Validation Error', detail: 'Description is too short.' },
    });
    const createRequestMock = vi.fn().mockReturnValue(throwError(() => httpErr));
    const { page } = buildSetup({ createRequest: createRequestMock });
    fillValidForm(page);

    page['submit']();

    expect(page['errorMessage']()).toBe('Description is too short.');
    expect(page['submitting']()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — AI suggestion
// ---------------------------------------------------------------------------

describe('RequestCreatePage — AI suggestion', () => {
  beforeAll(bootstrapTestEnv);
  afterEach(() => TestBed.resetTestingModule());

  it('canSuggestAiRole(): true only for STAFF', () => {
    const { page: staffPage } = buildSetup({ role: 'STAFF' });
    expect(staffPage['canSuggestAiRole']()).toBe(true);

    TestBed.resetTestingModule();

    const { page: adminPage } = buildSetup({ role: 'ADMIN' });
    expect(adminPage['canSuggestAiRole']()).toBe(false);

    TestBed.resetTestingModule();

    const { page: studentPage } = buildSetup({ role: 'STUDENT' });
    expect(studentPage['canSuggestAiRole']()).toBe(false);
  });

  it('canSuggestAi(): false when description < 10 chars', () => {
    const { page } = buildSetup({ role: 'STAFF' });
    page['form'].controls.description.setValue('short');
    expect(page['canSuggestAi']()).toBe(false);
  });

  it('canSuggestAi(): true when description >= 10 chars and not loading', () => {
    const { page } = buildSetup({ role: 'STAFF' });
    page['form'].controls.description.setValue('long enough description here');
    expect(page['canSuggestAi']()).toBe(true);
  });

  it('suggestClassification(): calls aiApi with description and populates aiSuggestion', () => {
    const suggestion: AiClassificationResponse = {
      suggestedRequestType: 'Reclamo',
      suggestedRequestTypeId: 7,
      suggestedPriority: 'HIGH',
      confidence: 0.9,
    };
    const suggestClassificationMock = vi.fn().mockReturnValue(of(suggestion));
    const { page } = buildSetup({ role: 'STAFF', suggestClassification: suggestClassificationMock });

    page['form'].controls.description.setValue('This is a long enough description');
    page['suggestClassification']();

    expect(suggestClassificationMock).toHaveBeenCalledWith({ description: 'This is a long enough description' });
    expect(page['aiSuggestion']()).toEqual(suggestion);
  });

  it('suggestClassification(): 503 → aiError set to AI_UNAVAILABLE_MSG', () => {
    const httpErr = new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable' });
    const suggestClassificationMock = vi.fn().mockReturnValue(throwError(() => httpErr));
    const { page } = buildSetup({ role: 'STAFF', suggestClassification: suggestClassificationMock });

    page['form'].controls.description.setValue('This is a long enough description');
    page['suggestClassification']();

    expect(page['aiError']()).toBe('La asistencia de IA no está disponible en este entorno.');
    expect(page['aiLoading']()).toBe(false);
  });

  it('suggestClassification(): non-503 error → aiError set from problem.detail', () => {
    const httpErr = new HttpErrorResponse({
      status: 500,
      statusText: 'Internal Server Error',
      error: { title: 'AI Error', detail: 'AI service crashed.' },
    });
    const suggestClassificationMock = vi.fn().mockReturnValue(throwError(() => httpErr));
    const { page } = buildSetup({ role: 'STAFF', suggestClassification: suggestClassificationMock });

    page['form'].controls.description.setValue('This is a long enough description');
    page['suggestClassification']();

    expect(page['aiError']()).toBe('AI service crashed.');
    expect(page['aiLoading']()).toBe(false);
  });

  it('applyAiSuggestion(): sets requestTypeId when suggestedRequestTypeId exists in catalog', () => {
    const { page } = buildSetup({
      role: 'STAFF',
      types: [
        { id: 7, name: 'Reclamo', active: true },
        { id: 8, name: 'Consulta', active: true },
      ],
    });
    page['aiSuggestion'].set({ suggestedRequestType: 'Reclamo', suggestedRequestTypeId: 7 });

    page['applyAiSuggestion']();

    expect(page['form'].controls.requestTypeId.value).toBe(7);
  });

  it('canApplyAiSuggestion(): false when no suggestion', () => {
    const { page } = buildSetup({ role: 'STAFF' });
    expect(page['canApplyAiSuggestion']()).toBe(false);
  });

  it('canApplyAiSuggestion(): false when suggestedRequestTypeId not in catalog', () => {
    const { page } = buildSetup({
      role: 'STAFF',
      types: [{ id: 1, name: 'Consulta', active: true }],
    });
    page['aiSuggestion'].set({ suggestedRequestType: 'Reclamo', suggestedRequestTypeId: 99 });

    expect(page['canApplyAiSuggestion']()).toBe(false);
  });

  it('canApplyAiSuggestion(): true when suggestedRequestTypeId is in catalog', () => {
    const { page } = buildSetup({
      role: 'STAFF',
      types: [{ id: 7, name: 'Reclamo', active: true }],
    });
    page['aiSuggestion'].set({ suggestedRequestType: 'Reclamo', suggestedRequestTypeId: 7 });

    expect(page['canApplyAiSuggestion']()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — Catalog loading
// ---------------------------------------------------------------------------

describe('RequestCreatePage — catalog loading', () => {
  beforeAll(bootstrapTestEnv);
  afterEach(() => TestBed.resetTestingModule());

  it('forkJoin populates requestTypes and originChannels signals', () => {
    const types: RequestTypeResponse[] = [{ id: 1, name: 'Consulta', active: true }];
    const channels: OriginChannelResponse[] = [{ id: 2, name: 'Email', active: true }];
    const { page } = buildSetup({ types, channels });

    expect(page['requestTypes']()).toEqual(types);
    expect(page['originChannels']()).toEqual(channels);
  });

  it('catalog forkJoin error → catalogError is set from problem.detail', () => {
    const { page } = buildSetup({ catalogError: true });

    expect(page['catalogError']()).toBe('Could not load catalog.');
  });
});
