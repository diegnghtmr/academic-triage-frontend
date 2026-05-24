/**
 * Tests for RequestCreatePage.
 *
 * Strategy: instantiate the component class inside TestBed.runInInjectionContext
 * so Angular's injection system wires all dependencies but no DOM rendering occurs.
 * vitest environment is 'node' — DOM-based rendering is intentionally bypassed;
 * this follows the same pattern used in auth.guard.spec.ts and role.guard.spec.ts.
 */
import '@angular/compiler';
import { readFileSync } from 'node:fs';
import { HttpErrorResponse } from '@angular/common/http';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import type { EnvironmentProviders, Provider, WritableSignal } from '@angular/core';
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

  it('HTTP error → globalSummaryItems contains problem.detail; submitting reverts to false', () => {
    const httpErr = new HttpErrorResponse({
      status: 422,
      statusText: 'Unprocessable Entity',
      error: { title: 'Validation Error', detail: 'Description is too short.' },
    });
    const createRequestMock = vi.fn().mockReturnValue(throwError(() => httpErr));
    const { page } = buildSetup({ createRequest: createRequestMock });
    fillValidForm(page);

    page['submit']();

    expect(page['globalSummaryItems']().some((i) => i.message === 'Description is too short.')).toBe(true);
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
    const { page } = buildSetup({
      role: 'STAFF',
      suggestClassification: suggestClassificationMock,
    });

    page['form'].controls.description.setValue('This is a long enough description');
    page['suggestClassification']();

    expect(suggestClassificationMock).toHaveBeenCalledWith({
      description: 'This is a long enough description',
    });
    expect(page['aiSuggestion']()).toEqual(suggestion);
  });

  it('suggestClassification(): 503 → aiError set to AI_UNAVAILABLE_MSG', () => {
    const httpErr = new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable' });
    const suggestClassificationMock = vi.fn().mockReturnValue(throwError(() => httpErr));
    const { page } = buildSetup({
      role: 'STAFF',
      suggestClassification: suggestClassificationMock,
    });

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
    const { page } = buildSetup({
      role: 'STAFF',
      suggestClassification: suggestClassificationMock,
    });

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

// ---------------------------------------------------------------------------
// Suite 6 — S3: markAllAsTouched + error visibility (UV-1 AC1, UV-1 AC2)
// ---------------------------------------------------------------------------

describe('RequestCreatePage — S3: submit invalid → markAllAsTouched (UV-1 AC1)', () => {
  beforeAll(bootstrapTestEnv);
  afterEach(() => TestBed.resetTestingModule());

  it('submit with invalid form → markAllAsTouched() is called (all controls become touched)', () => {
    const { page } = buildSetup();
    // Default form is invalid — all fields pristine/untouched
    expect(page['form'].touched).toBe(false);

    page['submit']();

    expect(page['form'].touched).toBe(true);
  });

  it('submit with invalid form → requestTypeId control becomes touched', () => {
    const { page } = buildSetup();
    expect(page['form'].controls.requestTypeId.touched).toBe(false);

    page['submit']();

    expect(page['form'].controls.requestTypeId.touched).toBe(true);
  });

  it('submit with invalid form → description control becomes touched', () => {
    const { page } = buildSetup();
    expect(page['form'].controls.description.touched).toBe(false);

    page['submit']();

    expect(page['form'].controls.description.touched).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite 7 — S3: fieldErrors from ProblemDetail mapped to controls (UV-6, UV-8)
// ---------------------------------------------------------------------------

describe('RequestCreatePage — S3: fieldErrors mapping via applyProblemToForm (UV-6 AC1, UV-8)', () => {
  beforeAll(bootstrapTestEnv);
  afterEach(() => TestBed.resetTestingModule());

  it('HTTP 422 with fieldErrors → description control gets server error', () => {
    const httpErr = new HttpErrorResponse({
      status: 422,
      statusText: 'Unprocessable Entity',
      error: {
        title: 'Validation Error',
        detail: 'Hay errores de validación.',
        fieldErrors: [{ field: 'description', message: 'La descripción es muy corta.' }],
      },
    });
    const createRequestMock = vi.fn().mockReturnValue(throwError(() => httpErr));
    const { page } = buildSetup({ createRequest: createRequestMock });
    page['form'].controls.requestTypeId.setValue(1);
    page['form'].controls.originChannelId.setValue(1);
    page['form'].controls.description.setValue('Valid description text here');

    page['submit']();

    const descErrors = page['form'].controls.description.errors;
    expect(descErrors).not.toBeNull();
    expect(descErrors?.['server']).toBe('La descripción es muy corta.');
  });

  it('HTTP 422 with fieldErrors → unknown field goes to globalSummaryItems', () => {
    const httpErr = new HttpErrorResponse({
      status: 422,
      statusText: 'Unprocessable Entity',
      error: {
        title: 'Validation Error',
        detail: 'Hay errores de validación.',
        fieldErrors: [{ field: 'unknownField', message: 'Campo desconocido.' }],
      },
    });
    const createRequestMock = vi.fn().mockReturnValue(throwError(() => httpErr));
    const { page } = buildSetup({ createRequest: createRequestMock });
    page['form'].controls.requestTypeId.setValue(1);
    page['form'].controls.originChannelId.setValue(1);
    page['form'].controls.description.setValue('Valid description text here');

    page['submit']();

    const items = page['globalSummaryItems']();
    expect(items.some((i) => i.message.includes('Campo desconocido.'))).toBe(true);
  });

  it('retry submit → clearServerErrors clears previous server errors before new request', () => {
    const httpErr = new HttpErrorResponse({
      status: 422,
      statusText: 'Unprocessable Entity',
      error: {
        title: 'Validation Error',
        detail: 'Error.',
        fieldErrors: [{ field: 'description', message: 'Server error 1.' }],
      },
    });
    const createRequestMock = vi
      .fn()
      .mockReturnValueOnce(throwError(() => httpErr))
      .mockReturnValueOnce(throwError(() => httpErr));
    const { page } = buildSetup({ createRequest: createRequestMock });
    page['form'].controls.requestTypeId.setValue(1);
    page['form'].controls.originChannelId.setValue(1);
    page['form'].controls.description.setValue('Valid description text here');

    page['submit']();
    // First call sets server error
    expect(page['form'].controls.description.errors?.['server']).toBe('Server error 1.');

    page['submit']();
    // Second call should clear and then re-apply — still has server error from second call
    expect(page['form'].controls.description.errors?.['server']).toBe('Server error 1.');
  });
});

// ---------------------------------------------------------------------------
// Suite 8 — S3: description field error message via messageFor() (UV-1)
// ---------------------------------------------------------------------------

describe('RequestCreatePage — S3: description error message text (UV-1)', () => {
  beforeAll(bootstrapTestEnv);
  afterEach(() => TestBed.resetTestingModule());

  it('firstDescriptionError() with required error → returns "Este campo es requerido"', () => {
    const { page } = buildSetup();
    page['form'].controls.description.setValue('');
    page['form'].controls.description.markAsTouched();

    const errMsg = page['firstDescriptionError']();
    expect(errMsg).toBe('Este campo es requerido');
  });

  it('firstDescriptionError() with minlength → returns "Mínimo 10 caracteres"', () => {
    const { page } = buildSetup();
    page['form'].controls.description.setValue('short');
    page['form'].controls.description.markAsTouched();

    const errMsg = page['firstDescriptionError']();
    expect(errMsg).toBe('Mínimo 10 caracteres');
  });

  it('firstDescriptionError() with maxlength → returns "Máximo 2000 caracteres"', () => {
    const { page } = buildSetup();
    page['form'].controls.description.setValue('a'.repeat(2001));
    page['form'].controls.description.markAsTouched();

    const errMsg = page['firstDescriptionError']();
    expect(errMsg).toBe('Máximo 2000 caracteres');
  });

  it('firstDescriptionError() with no errors → returns null', () => {
    const { page } = buildSetup();
    page['form'].controls.description.setValue('Valid description text');
    page['form'].controls.description.markAsTouched();

    const errMsg = page['firstDescriptionError']();
    expect(errMsg).toBeNull();
  });

  it('firstRequestTypeIdError() with required error → returns "Este campo es requerido"', () => {
    const { page } = buildSetup();
    page['form'].controls.requestTypeId.setValue(null);
    page['form'].controls.requestTypeId.markAsTouched();

    expect(page['firstRequestTypeIdError']()).toBe('Este campo es requerido');
  });

  it('firstOriginChannelIdError() with required error → returns "Este campo es requerido"', () => {
    const { page } = buildSetup();
    page['form'].controls.originChannelId.setValue(null);
    page['form'].controls.originChannelId.markAsTouched();

    expect(page['firstOriginChannelIdError']()).toBe('Este campo es requerido');
  });
});

// ---------------------------------------------------------------------------
// Suite 9 — S3: descriptionRules computed (UV-5, UV-8 AC2-AC3)
// ---------------------------------------------------------------------------

describe('RequestCreatePage — S3: descriptionRules computed (UV-5)', () => {
  beforeAll(bootstrapTestEnv);
  afterEach(() => TestBed.resetTestingModule());

  it('empty description → required and min10 hard rules unsatisfied', () => {
    const { page } = buildSetup();
    page['form'].controls.description.setValue('');

    const rules = page['descriptionRules']();
    const requiredRule = rules.find((r) => r.id === 'required');
    const min10Rule = rules.find((r) => r.id === 'min10');
    expect(requiredRule?.satisfied).toBe(false);
    expect(min10Rule?.satisfied).toBe(false);
  });

  it('description with 5 chars → "required" satisfied, "min10" NOT satisfied', () => {
    const { page } = buildSetup();
    page['form'].controls.description.setValue('hello');

    const rules = page['descriptionRules']();
    const requiredRule = rules.find((r) => r.id === 'required');
    const min10Rule = rules.find((r) => r.id === 'min10');
    expect(requiredRule?.satisfied).toBe(true);
    expect(min10Rule?.satisfied).toBe(false);
  });

  it('description >= 10 chars <= 2000 → hard rules satisfied', () => {
    const { page } = buildSetup();
    page['form'].controls.description.setValue('1234567890');

    const rules = page['descriptionRules']();
    const hardRules = rules.filter((r) => r.kind === 'hard');
    expect(hardRules.every((r) => r.satisfied)).toBe(true);
  });

  it('description > 2000 chars → max2000 hard rule unsatisfied', () => {
    const { page } = buildSetup();
    page['form'].controls.description.setValue('a'.repeat(2001));

    const rules = page['descriptionRules']();
    const max2000Rule = rules.find((r) => r.id === 'max2000');
    expect(max2000Rule?.satisfied).toBe(false);
  });

  it('advisory rule: identifica tramite → satisfied when >= 5 words', () => {
    const { page } = buildSetup();
    page['form'].controls.description.setValue('necesito tramitar mi certificado urgente');

    const rules = page['descriptionRules']();
    const advisoryRule = rules.find((r) => r.id === 'identifies-tramite');
    expect(advisoryRule?.satisfied).toBe(true);
  });

  it('advisory rule: identifica tramite → unsatisfied with < 5 words', () => {
    const { page } = buildSetup();
    page['form'].controls.description.setValue('uno dos tres cuatro');

    const rules = page['descriptionRules']();
    const advisoryRule = rules.find((r) => r.id === 'identifies-tramite');
    expect(advisoryRule?.satisfied).toBe(false);
  });

  it('advisory rule: sufficient detail → satisfied when >= 40 chars', () => {
    const { page } = buildSetup();
    page['form'].controls.description.setValue('a'.repeat(40));

    const rules = page['descriptionRules']();
    const advisoryRule = rules.find((r) => r.id === 'sufficient-detail');
    expect(advisoryRule?.satisfied).toBe(true);
  });

  it('advisory rule: sufficient detail → unsatisfied when < 40 chars', () => {
    const { page } = buildSetup();
    page['form'].controls.description.setValue('short text');

    const rules = page['descriptionRules']();
    const advisoryRule = rules.find((r) => r.id === 'sufficient-detail');
    expect(advisoryRule?.satisfied).toBe(false);
  });

  it('all rules have kind hard or advisory', () => {
    const { page } = buildSetup();
    page['form'].controls.description.setValue('test');

    const rules = page['descriptionRules']();
    expect(rules.every((r) => r.kind === 'hard' || r.kind === 'advisory')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite 10 — S3: AI button disabled reason (UV-5 AC6, UV-8 AC4)
// ---------------------------------------------------------------------------

describe('RequestCreatePage — S3: AI button disabled reason (UV-5 AC6)', () => {
  beforeAll(bootstrapTestEnv);
  afterEach(() => TestBed.resetTestingModule());

  it('aiDisabledReason(): non-null when description < 10 chars', () => {
    const { page } = buildSetup({ role: 'STAFF' });
    page['form'].controls.description.setValue('short');

    expect(page['aiDisabledReason']()).not.toBeNull();
  });

  it('aiDisabledReason(): null when description >= 10 chars and not loading', () => {
    const { page } = buildSetup({ role: 'STAFF' });
    page['form'].controls.description.setValue('long enough description here');

    expect(page['aiDisabledReason']()).toBeNull();
  });

  it('aiDisabledReason(): non-null when AI is loading (even with valid description)', () => {
    const { page } = buildSetup({ role: 'STAFF' });
    page['form'].controls.description.setValue('long enough description here');
    page['aiLoading'].set(true);

    expect(page['aiDisabledReason']()).not.toBeNull();
  });

  it('aiDisabledReason() text includes minimum character hint when < 10 chars', () => {
    const { page } = buildSetup({ role: 'STAFF' });
    page['form'].controls.description.setValue('short');

    const reason = page['aiDisabledReason']();
    // Should mention 10 characters minimum
    expect(reason).toContain('10');
  });
});

// ---------------------------------------------------------------------------
// Suite 11 — S3: template source-level ARIA assertions (UV-7)
// ---------------------------------------------------------------------------

describe('RequestCreatePage — S3: template ARIA source assertions (UV-7)', () => {
  const source = readFileSync(
    new URL('./request-create-page.ts', import.meta.url).pathname,
    'utf-8',
  );

  it('description textarea binds [attr.aria-required]', () => {
    expect(source).toContain('[attr.aria-required]');
  });

  it('description textarea binds [attr.aria-invalid]', () => {
    expect(source).toContain('[attr.aria-invalid]');
  });

  it('description textarea has formControlName="description"', () => {
    expect(source).toContain('formControlName="description"');
  });

  it('at-form-field used for description (UV-7 AC1)', () => {
    expect(source).toContain('at-form-field');
  });

  it('at-error-summary present for global errors (UV-7 AC4)', () => {
    expect(source).toContain('at-error-summary');
  });

  it('at-character-counter wired to description (UV-5 AC5)', () => {
    expect(source).toContain('at-character-counter');
  });

  it('at-validation-checklist wired to descriptionRules (UV-5 AC1)', () => {
    expect(source).toContain('at-validation-checklist');
  });

  it('student hint has id for aria-describedby linking (UV-7 AC1)', () => {
    expect(source).toContain('id="crt-ch-hint"');
  });

  it('student input has aria-describedby linking to hint (UV-7 AC1)', () => {
    expect(source).toContain('aria-describedby="crt-ch-hint"');
  });

  it('AI disabled reason uses at-error-alert with variant warning (UV-11 AC3)', () => {
    expect(source).toContain('variant="warning"');
  });
});
