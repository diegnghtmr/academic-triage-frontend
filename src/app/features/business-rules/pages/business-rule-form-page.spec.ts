/**
 * Tests for BusinessRuleFormPage.
 *
 * Strategy: instantiate the component class inside TestBed.runInInjectionContext
 * so Angular's injection system wires all dependencies but no DOM rendering occurs.
 * vitest environment is 'node' — DOM-based rendering is intentionally bypassed;
 * this follows the same pattern used in request-create-page.spec.ts.
 *
 * Covers:
 *   A. Form basics (name, description, conditionType, resultingPriority validators)
 *   B. Conditional visibility computeds (showDeadlineDays, showRequestTypeSelector)
 *   C. submit() construction — conditionValue derivation, guard conditions, edit vs create
 *   D. loadItem (edit mode) — form population from BusinessRuleResponse
 *   E. Catalog loading — requestTypes populated, catalogError on failure
 */
import '@angular/compiler';
import { EnvironmentProviders, provideZonelessChangeDetection } from '@angular/core';
import type { Provider } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';

import { CatalogAdminApiService } from '@features/catalogs/data-access/catalog-admin-api.service';
import type { RequestTypeResponse } from '@features/catalogs/models/catalog-admin.types';

import { BusinessRulesApiService } from '../data-access/business-rules-api.service';
import type { BusinessRuleResponse } from '../models/business-rule.types';
import { BusinessRuleFormPage } from './business-rule-form-page';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const RT_LIST: RequestTypeResponse[] = [
  { id: 1, name: 'Certificado', active: true },
  { id: 2, name: 'Beca', active: true },
];

function makeActivatedRoute(id: string | null): ActivatedRoute {
  return {
    snapshot: {
      paramMap: convertToParamMap(id !== null ? { id } : {}),
    },
  } as unknown as ActivatedRoute;
}

interface SetupOptions {
  /** Route id param — null means create mode */
  id?: string | null;
  /** Stub response for getById */
  rule?: BusinessRuleResponse;
  /** Override create stub */
  create?: ReturnType<typeof vi.fn>;
  /** Override update stub */
  update?: ReturnType<typeof vi.fn>;
  /** Override listRequestTypes stub */
  listRequestTypes?: ReturnType<typeof vi.fn>;
}

function setup(opts: SetupOptions = {}): {
  page: BusinessRuleFormPage;
  createStub: ReturnType<typeof vi.fn>;
  updateStub: ReturnType<typeof vi.fn>;
  navigateSpy: ReturnType<typeof vi.spyOn>;
} {
  const {
    id = null,
    rule,
    create: createOverride,
    update: updateOverride,
    listRequestTypes: listRTOverride,
  } = opts;

  const createStub = createOverride ?? vi.fn().mockReturnValue(of({ id: 99 }));
  const updateStub = updateOverride ?? vi.fn().mockReturnValue(of({ id: Number(id) }));
  const getByIdStub = rule !== undefined ? vi.fn().mockReturnValue(of(rule)) : vi.fn();
  const listRequestTypesStub = listRTOverride ?? vi.fn().mockReturnValue(of(RT_LIST));

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection() as unknown as Provider | EnvironmentProviders,
      provideHttpClient(withFetch()),
      provideHttpClientTesting(),
      provideRouter([]),
      {
        provide: BusinessRulesApiService,
        useValue: { getById: getByIdStub, create: createStub, update: updateStub },
      },
      {
        provide: CatalogAdminApiService,
        useValue: { listRequestTypes: listRequestTypesStub },
      },
      {
        provide: ActivatedRoute,
        useValue: makeActivatedRoute(id),
      },
      BusinessRuleFormPage,
    ],
  });

  const page = TestBed.runInInjectionContext(() => new BusinessRuleFormPage());
  const router = TestBed.inject(Router);
  const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

  return { page, createStub, updateStub, navigateSpy };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test environment bootstrap
// ─────────────────────────────────────────────────────────────────────────────

beforeAll(() => {
  if (!('document' in globalThis)) {
    Object.defineProperty(globalThis, 'document', { value: {}, configurable: true });
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

// ─────────────────────────────────────────────────────────────────────────────
// A. Form basics
// ─────────────────────────────────────────────────────────────────────────────

describe('BusinessRuleFormPage — A. Form basics', () => {
  it('name: required — invalid when empty', () => {
    const { page } = setup();
    page['form'].controls.name.setValue('');
    expect(page['form'].controls.name.hasError('required')).toBe(true);
  });

  it('name: maxLength 150 — invalid at 151 chars', () => {
    const { page } = setup();
    page['form'].controls.name.setValue('a'.repeat(151));
    expect(page['form'].controls.name.hasError('maxlength')).toBe(true);
  });

  it('name: valid at exactly 150 chars', () => {
    const { page } = setup();
    page['form'].controls.name.setValue('a'.repeat(150));
    expect(page['form'].controls.name.valid).toBe(true);
  });

  it('description: optional — valid when empty', () => {
    const { page } = setup();
    page['form'].controls.description.setValue('');
    expect(page['form'].controls.description.valid).toBe(true);
  });

  it('description: maxLength 500 — invalid at 501 chars', () => {
    const { page } = setup();
    page['form'].controls.description.setValue('a'.repeat(501));
    expect(page['form'].controls.description.hasError('maxlength')).toBe(true);
  });

  it('conditionType: required — present and defaults to REQUEST_TYPE', () => {
    const { page } = setup();
    expect(page['form'].controls.conditionType.value).toBe('REQUEST_TYPE');
    expect(page['form'].controls.conditionType.hasError('required')).toBe(false);
  });

  it('resultingPriority: required — defaults to HIGH', () => {
    const { page } = setup();
    expect(page['form'].controls.resultingPriority.value).toBe('HIGH');
    expect(page['form'].controls.resultingPriority.hasError('required')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B. Conditional visibility computeds
// ─────────────────────────────────────────────────────────────────────────────

describe('BusinessRuleFormPage — B. Conditional visibility computeds', () => {
  it('showDeadlineDays(): false for REQUEST_TYPE', () => {
    const { page } = setup();
    page['form'].controls.conditionType.setValue('REQUEST_TYPE');
    expect(page['showDeadlineDays']()).toBe(false);
  });

  it('showDeadlineDays(): true for DEADLINE', () => {
    const { page } = setup();
    page['form'].controls.conditionType.setValue('DEADLINE');
    expect(page['showDeadlineDays']()).toBe(true);
  });

  it('showDeadlineDays(): true for REQUEST_TYPE_AND_DEADLINE', () => {
    const { page } = setup();
    page['form'].controls.conditionType.setValue('REQUEST_TYPE_AND_DEADLINE');
    expect(page['showDeadlineDays']()).toBe(true);
  });

  it('showRequestTypeSelector(): true for REQUEST_TYPE', () => {
    const { page } = setup();
    page['form'].controls.conditionType.setValue('REQUEST_TYPE');
    expect(page['showRequestTypeSelector']()).toBe(true);
  });

  it('showRequestTypeSelector(): false for DEADLINE', () => {
    const { page } = setup();
    page['form'].controls.conditionType.setValue('DEADLINE');
    expect(page['showRequestTypeSelector']()).toBe(false);
  });

  it('showRequestTypeSelector(): true for REQUEST_TYPE_AND_DEADLINE', () => {
    const { page } = setup();
    page['form'].controls.conditionType.setValue('REQUEST_TYPE_AND_DEADLINE');
    expect(page['showRequestTypeSelector']()).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C. submit() construction
// ─────────────────────────────────────────────────────────────────────────────

describe('BusinessRuleFormPage — C. submit() construction', () => {
  function fillBase(page: BusinessRuleFormPage) {
    page['form'].controls.name.setValue('Regla test');
    page['form'].controls.description.setValue('');
  }

  // ── REQUEST_TYPE ────────────────────────────────────────────────────────────

  it('REQUEST_TYPE without requestTypeId → sets submitError, no API call', () => {
    const { page, createStub } = setup();
    fillBase(page);
    page['form'].controls.conditionType.setValue('REQUEST_TYPE');
    page['form'].controls.requestTypeId.setValue(null);

    page['submit']();

    expect(page['submitError']()).not.toBeNull();
    expect(createStub).not.toHaveBeenCalled();
  });

  it('REQUEST_TYPE with requestTypeId=5 → calls create with correct body shape', () => {
    const { page, createStub } = setup();
    fillBase(page);
    page['form'].controls.conditionType.setValue('REQUEST_TYPE');
    page['form'].controls.requestTypeId.setValue(5);

    page['submit']();

    expect(createStub).toHaveBeenCalledOnce();
    const body = createStub.mock.calls[0][0] as Record<string, unknown>;
    expect(body['conditionType']).toBe('REQUEST_TYPE');
    expect(body['conditionValue']).toBe('5');
    expect(body['requestTypeId']).toBe(5);
    expect(body['resultingPriority']).toBe('HIGH');
  });

  // ── DEADLINE ────────────────────────────────────────────────────────────────

  it('DEADLINE without deadlineDays → sets submitError, no API call', () => {
    const { page, createStub } = setup();
    fillBase(page);
    page['form'].controls.conditionType.setValue('DEADLINE');
    page['form'].controls.deadlineDays.setValue(null);

    page['submit']();

    expect(page['submitError']()).not.toBeNull();
    expect(createStub).not.toHaveBeenCalled();
  });

  it('DEADLINE with negative deadlineDays → sets submitError, no API call', () => {
    const { page, createStub } = setup();
    fillBase(page);
    page['form'].controls.conditionType.setValue('DEADLINE');
    page['form'].controls.deadlineDays.setValue(-1);

    page['submit']();

    expect(page['submitError']()).not.toBeNull();
    expect(createStub).not.toHaveBeenCalled();
  });

  it('DEADLINE with deadlineDays=3 → conditionValue "3", requestTypeId null', () => {
    const { page, createStub } = setup();
    fillBase(page);
    page['form'].controls.conditionType.setValue('DEADLINE');
    page['form'].controls.deadlineDays.setValue(3);

    page['submit']();

    expect(createStub).toHaveBeenCalledOnce();
    const body = createStub.mock.calls[0][0] as Record<string, unknown>;
    expect(body['conditionValue']).toBe('3');
    expect(body['requestTypeId']).toBeNull();
  });

  it('DEADLINE with deadlineDays=3.7 → conditionValue "3" (Math.trunc)', () => {
    const { page, createStub } = setup();
    fillBase(page);
    page['form'].controls.conditionType.setValue('DEADLINE');
    page['form'].controls.deadlineDays.setValue(3.7);

    page['submit']();

    expect(createStub).toHaveBeenCalledOnce();
    const body = createStub.mock.calls[0][0] as Record<string, unknown>;
    expect(body['conditionValue']).toBe('3');
  });

  // ── REQUEST_TYPE_AND_DEADLINE ───────────────────────────────────────────────

  it('REQUEST_TYPE_AND_DEADLINE missing requestTypeId → submitError, no call', () => {
    const { page, createStub } = setup();
    fillBase(page);
    page['form'].controls.conditionType.setValue('REQUEST_TYPE_AND_DEADLINE');
    page['form'].controls.requestTypeId.setValue(null);
    page['form'].controls.deadlineDays.setValue(5);

    page['submit']();

    expect(page['submitError']()).not.toBeNull();
    expect(createStub).not.toHaveBeenCalled();
  });

  it('REQUEST_TYPE_AND_DEADLINE missing deadlineDays → submitError, no call', () => {
    const { page, createStub } = setup();
    fillBase(page);
    page['form'].controls.conditionType.setValue('REQUEST_TYPE_AND_DEADLINE');
    page['form'].controls.requestTypeId.setValue(3);
    page['form'].controls.deadlineDays.setValue(null);

    page['submit']();

    expect(page['submitError']()).not.toBeNull();
    expect(createStub).not.toHaveBeenCalled();
  });

  it('REQUEST_TYPE_AND_DEADLINE with both values → conditionValue from deadlineDays, requestTypeId set', () => {
    const { page, createStub } = setup();
    fillBase(page);
    page['form'].controls.conditionType.setValue('REQUEST_TYPE_AND_DEADLINE');
    page['form'].controls.requestTypeId.setValue(3);
    page['form'].controls.deadlineDays.setValue(10);

    page['submit']();

    expect(createStub).toHaveBeenCalledOnce();
    const body = createStub.mock.calls[0][0] as Record<string, unknown>;
    expect(body['conditionValue']).toBe('10');
    expect(body['requestTypeId']).toBe(3);
  });

  // ── description trimming ────────────────────────────────────────────────────

  it('description blank → not included in body', () => {
    const { page, createStub } = setup();
    page['form'].controls.name.setValue('Test');
    page['form'].controls.conditionType.setValue('DEADLINE');
    page['form'].controls.deadlineDays.setValue(2);
    page['form'].controls.description.setValue('   ');

    page['submit']();

    expect(createStub).toHaveBeenCalledOnce();
    const body = createStub.mock.calls[0][0] as Record<string, unknown>;
    expect(body).not.toHaveProperty('description');
  });

  it('description present → trimmed in body', () => {
    const { page, createStub } = setup();
    page['form'].controls.name.setValue('Test');
    page['form'].controls.conditionType.setValue('DEADLINE');
    page['form'].controls.deadlineDays.setValue(2);
    page['form'].controls.description.setValue('  Regla importante  ');

    page['submit']();

    expect(createStub).toHaveBeenCalledOnce();
    const body = createStub.mock.calls[0][0] as Record<string, unknown>;
    expect(body['description']).toBe('Regla importante');
  });

  // ── edit mode ───────────────────────────────────────────────────────────────

  it('edit mode: calls update(id, body) with same shape plus active', () => {
    const rule: BusinessRuleResponse = {
      id: 7,
      name: 'Existente',
      description: 'Desc',
      conditionType: 'DEADLINE',
      conditionValue: '4',
      resultingPriority: 'LOW',
      active: true,
    };
    const { page, updateStub, createStub } = setup({ id: '7', rule });

    // Form is populated by loadItem — just submit as-is
    page['submit']();

    expect(createStub).not.toHaveBeenCalled();
    expect(updateStub).toHaveBeenCalledOnce();
    const [calledId, body] = updateStub.mock.calls[0] as [number, Record<string, unknown>];
    expect(calledId).toBe(7);
    expect(body).toHaveProperty('conditionType', 'DEADLINE');
    expect(body).toHaveProperty('active');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D. loadItem (edit mode)
// ─────────────────────────────────────────────────────────────────────────────

describe('BusinessRuleFormPage — D. loadItem (edit mode)', () => {
  it('DEADLINE rule: conditionValue "5" → deadlineDays=5, requestTypeId=null', () => {
    const rule: BusinessRuleResponse = {
      id: 1,
      name: 'Rule D',
      conditionType: 'DEADLINE',
      conditionValue: '5',
      resultingPriority: 'MEDIUM',
      active: true,
    };
    const { page } = setup({ id: '1', rule });

    expect(page['form'].controls.deadlineDays.value).toBe(5);
    expect(page['form'].controls.requestTypeId.value).toBeNull();
  });

  it('REQUEST_TYPE rule: requestTypeId from rule.requestType.id, deadlineDays=null', () => {
    const rule: BusinessRuleResponse = {
      id: 2,
      name: 'Rule RT',
      conditionType: 'REQUEST_TYPE',
      conditionValue: '3',
      requestType: { id: 3, name: 'Certificado' },
      resultingPriority: 'HIGH',
      active: true,
    };
    const { page } = setup({ id: '2', rule });

    expect(page['form'].controls.requestTypeId.value).toBe(3);
    expect(page['form'].controls.deadlineDays.value).toBeNull();
  });

  it('REQUEST_TYPE_AND_DEADLINE rule: both deadlineDays and requestTypeId set', () => {
    const rule: BusinessRuleResponse = {
      id: 3,
      name: 'Rule Both',
      conditionType: 'REQUEST_TYPE_AND_DEADLINE',
      conditionValue: '7',
      requestType: { id: 4, name: 'Beca' },
      resultingPriority: 'LOW',
      active: false,
    };
    const { page } = setup({ id: '3', rule });

    expect(page['form'].controls.deadlineDays.value).toBe(7);
    expect(page['form'].controls.requestTypeId.value).toBe(4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// E. Catalog loading
// ─────────────────────────────────────────────────────────────────────────────

describe('BusinessRuleFormPage — E. Catalog loading', () => {
  it('on constructor, loadCatalog() populates requestTypes', () => {
    const { page } = setup();
    expect(page['requestTypes']()).toHaveLength(RT_LIST.length);
    expect(page['requestTypes']()[0].id).toBe(1);
  });

  it('on catalog error, catalogError signal is set', () => {
    const errorStub = vi.fn().mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            error: { title: 'Error catálogo', detail: 'No se pudo cargar.' },
            status: 500,
          }),
      ),
    );
    const { page } = setup({ listRequestTypes: errorStub });
    expect(page['catalogError']()).not.toBeNull();
    expect(page['requestTypes']()).toHaveLength(0);
  });
});
