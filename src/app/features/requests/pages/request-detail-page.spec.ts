/**
 * Tests for RequestDetailPage — S4a: action error wiring (UV-8 AC5, UV-6, UV-7).
 *
 * Strategy:
 *  - Source-level assertions (readFileSync): verify template structure for FormField,
 *    ErrorAlert wiring, and ARIA attributes — no DOM rendering needed.
 *  - FormBuilder tests: verify per-action error signals and applyProblemToForm wiring.
 *
 * All suites follow the pattern used in request-create-page.spec.ts (Suite 11).
 */
import '@angular/compiler';
import { readFileSync } from 'node:fs';
import { HttpErrorResponse } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import type { EnvironmentProviders, Provider } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { convertToParamMap } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { EMPTY, of, throwError } from 'rxjs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AuthSessionStore } from '@core/auth/auth-session.store';
import { CatalogApiService } from '../data-access/catalog-api.service';
import { RequestsApiService } from '../data-access/requests-api.service';
import { AiApiService } from '../data-access/ai-api.service';
import { RequestDetailPage } from './request-detail-page';

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

function bootstrapTestEnv(): void {
  if (!('document' in globalThis)) {
    Object.defineProperty(globalThis, 'document', { value: {}, configurable: true });
  }
  try {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  } catch {
    // Already initialized.
  }
}

// ---------------------------------------------------------------------------
// Setup helper
// ---------------------------------------------------------------------------

interface DetailSetupOptions {
  requestId?: number;
  role?: 'STUDENT' | 'STAFF' | 'ADMIN';
  getRequestById?: ReturnType<typeof vi.fn>;
  getRequestHistory?: ReturnType<typeof vi.fn>;
  classifyRequest?: ReturnType<typeof vi.fn>;
  prioritizeRequest?: ReturnType<typeof vi.fn>;
  assignRequest?: ReturnType<typeof vi.fn>;
  attendRequest?: ReturnType<typeof vi.fn>;
  closeRequest?: ReturnType<typeof vi.fn>;
  cancelRequest?: ReturnType<typeof vi.fn>;
  rejectRequest?: ReturnType<typeof vi.fn>;
  addHistoryNote?: ReturnType<typeof vi.fn>;
}

const EMPTY_REQUEST_RESPONSE = {
  id: 1,
  status: 'REGISTERED',
  description: 'Test',
  requestType: null,
  originChannel: null,
  registrationDateTime: '2026-01-01T00:00:00Z',
  history: [],
  requesterName: 'test_user',
  requesterId: 99,
  assignedToName: null,
  priority: null,
  deadline: null,
};

function buildSetup(opts: DetailSetupOptions = {}): RequestDetailPage {
  const getRequestByIdMock =
    opts.getRequestById ?? vi.fn().mockReturnValue(of(EMPTY_REQUEST_RESPONSE));
  const getRequestHistoryMock = opts.getRequestHistory ?? vi.fn().mockReturnValue(of([]));
  const classifyRequestMock = opts.classifyRequest ?? vi.fn().mockReturnValue(EMPTY);
  const prioritizeRequestMock = opts.prioritizeRequest ?? vi.fn().mockReturnValue(EMPTY);
  const assignRequestMock = opts.assignRequest ?? vi.fn().mockReturnValue(EMPTY);
  const attendRequestMock = opts.attendRequest ?? vi.fn().mockReturnValue(EMPTY);
  const closeRequestMock = opts.closeRequest ?? vi.fn().mockReturnValue(EMPTY);
  const cancelRequestMock = opts.cancelRequest ?? vi.fn().mockReturnValue(EMPTY);
  const rejectRequestMock = opts.rejectRequest ?? vi.fn().mockReturnValue(EMPTY);
  const addHistoryNoteMock = opts.addHistoryNote ?? vi.fn().mockReturnValue(EMPTY);

  const requestId = opts.requestId ?? 1;

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection() as unknown as Provider | EnvironmentProviders,
      provideHttpClient(withFetch()),
      provideHttpClientTesting(),
      {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        provide: (require('@angular/router') as { ActivatedRoute: unknown }).ActivatedRoute,
        useValue: {
          paramMap: of(convertToParamMap({ requestId: String(requestId) })),
        },
      },
      {
        provide: RequestsApiService,
        useValue: {
          getRequestById: getRequestByIdMock,
          getRequestHistory: getRequestHistoryMock,
          classifyRequest: classifyRequestMock,
          prioritizeRequest: prioritizeRequestMock,
          assignRequest: assignRequestMock,
          attendRequest: attendRequestMock,
          closeRequest: closeRequestMock,
          cancelRequest: cancelRequestMock,
          rejectRequest: rejectRequestMock,
          addHistoryNote: addHistoryNoteMock,
          getPrioritySuggestion: vi.fn().mockReturnValue(EMPTY),
        },
      },
      {
        provide: CatalogApiService,
        useValue: { listRequestTypes: vi.fn().mockReturnValue(of([])) },
      },
      {
        provide: AiApiService,
        useValue: { summarizeRequest: vi.fn().mockReturnValue(EMPTY) },
      },
      {
        provide: AuthSessionStore,
        useValue: {
          role: () => opts.role ?? 'ADMIN',
          user: () => ({ id: 1 }),
        },
      },
      RequestDetailPage,
    ],
  });

  return TestBed.runInInjectionContext(() => new RequestDetailPage());
}

// ---------------------------------------------------------------------------
// Suite 1 — S4a: per-action error signals exist on the component (UV-8 AC5)
// ---------------------------------------------------------------------------

describe('RequestDetailPage — S4a: per-action error signals (UV-8 AC5)', () => {
  beforeAll(bootstrapTestEnv);
  afterEach(() => TestBed.resetTestingModule());

  it('classifyError signal is initialized to null', () => {
    const page = buildSetup();
    expect(page['classifyError']()).toBeNull();
  });

  it('prioritizeError signal is initialized to null', () => {
    const page = buildSetup();
    expect(page['prioritizeError']()).toBeNull();
  });

  it('assignError signal is initialized to null', () => {
    const page = buildSetup();
    expect(page['assignError']()).toBeNull();
  });

  it('attendError signal is initialized to null', () => {
    const page = buildSetup();
    expect(page['attendError']()).toBeNull();
  });

  it('closeError signal is initialized to null', () => {
    const page = buildSetup();
    expect(page['closeError']()).toBeNull();
  });

  it('cancelError signal is initialized to null', () => {
    const page = buildSetup();
    expect(page['cancelError']()).toBeNull();
  });

  it('rejectError signal is initialized to null', () => {
    const page = buildSetup();
    expect(page['rejectError']()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — S4a: classify action error wiring (UV-8 AC5, UV-6)
// ---------------------------------------------------------------------------

describe('RequestDetailPage — S4a: classify action error wiring (UV-8 AC5)', () => {
  beforeAll(bootstrapTestEnv);
  afterEach(() => TestBed.resetTestingModule());

  it('submitClassify() with HTTP error → classifyError set from problem.detail', () => {
    const httpErr = new HttpErrorResponse({
      status: 422,
      statusText: 'Unprocessable Entity',
      error: { title: 'Validation Error', detail: 'Tipo de solicitud no válido.' },
    });
    const page = buildSetup({
      classifyRequest: vi.fn().mockReturnValue(throwError(() => httpErr)),
    });

    page['classifyForm'].controls.requestTypeId.setValue(1);
    page['submitClassify']();

    expect(page['classifyError']()).toBe('Tipo de solicitud no válido.');
  });

  it('submitClassify() success → classifyError reset to null', () => {
    const page = buildSetup({
      classifyRequest: vi.fn().mockReturnValue(of(EMPTY_REQUEST_RESPONSE)),
    });
    page['classifyError'].set('Previous error');
    page['classifyForm'].controls.requestTypeId.setValue(1);
    page['submitClassify']();

    expect(page['classifyError']()).toBeNull();
  });

  it('submitClassify() with fieldErrors → requestTypeId control gets server error', () => {
    const httpErr = new HttpErrorResponse({
      status: 422,
      statusText: 'Unprocessable Entity',
      error: {
        title: 'Validation Error',
        detail: 'Errores de validación.',
        fieldErrors: [{ field: 'requestTypeId', message: 'Tipo requerido.' }],
      },
    });
    const page = buildSetup({
      classifyRequest: vi.fn().mockReturnValue(throwError(() => httpErr)),
    });

    page['classifyForm'].controls.requestTypeId.setValue(1);
    page['submitClassify']();

    const ctrl = page['classifyForm'].controls.requestTypeId;
    expect(ctrl.errors?.['server']).toBe('Tipo requerido.');
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — S4a: prioritize action error wiring (UV-8 AC5, UV-6)
// ---------------------------------------------------------------------------

describe('RequestDetailPage — S4a: prioritize action error wiring (UV-8 AC5)', () => {
  beforeAll(bootstrapTestEnv);
  afterEach(() => TestBed.resetTestingModule());

  it('submitPrioritize() with HTTP error → prioritizeError set from problem.detail', () => {
    const httpErr = new HttpErrorResponse({
      status: 422,
      statusText: 'Unprocessable Entity',
      error: { title: 'Validation Error', detail: 'Justificación inválida.' },
    });
    const page = buildSetup({
      prioritizeRequest: vi.fn().mockReturnValue(throwError(() => httpErr)),
    });

    page['prioritizeForm'].controls.priority.setValue('HIGH');
    page['prioritizeForm'].controls.justification.setValue('Valid justification text here');
    page['submitPrioritize']();

    expect(page['prioritizeError']()).toBe('Justificación inválida.');
  });

  it('submitPrioritize() with fieldErrors → justification control gets server error', () => {
    const httpErr = new HttpErrorResponse({
      status: 422,
      statusText: 'Unprocessable Entity',
      error: {
        title: 'Validation Error',
        detail: 'Errores.',
        fieldErrors: [{ field: 'justification', message: 'Justificación muy corta.' }],
      },
    });
    const page = buildSetup({
      prioritizeRequest: vi.fn().mockReturnValue(throwError(() => httpErr)),
    });

    page['prioritizeForm'].controls.priority.setValue('HIGH');
    page['prioritizeForm'].controls.justification.setValue('Valid justification text here');
    page['submitPrioritize']();

    expect(page['prioritizeForm'].controls.justification.errors?.['server']).toBe(
      'Justificación muy corta.',
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — S4a: assign action error wiring (UV-8 AC5, UV-6)
// ---------------------------------------------------------------------------

describe('RequestDetailPage — S4a: assign action error wiring (UV-8 AC5)', () => {
  beforeAll(bootstrapTestEnv);
  afterEach(() => TestBed.resetTestingModule());

  it('submitAssign() with 404 HTTP error → assignError shows recovery guidance (UV-8 AC6)', () => {
    const httpErr = new HttpErrorResponse({
      status: 404,
      statusText: 'Not Found',
      error: { title: 'Not Found', detail: 'Usuario no encontrado.' },
    });
    const page = buildSetup({
      assignRequest: vi.fn().mockReturnValue(throwError(() => httpErr)),
    });

    page['assignForm'].controls.assignedToUserId.setValue(999);
    page['submitAssign']();

    // 404 triggers the recovery guidance copy (UV-8 AC6 — assign by numeric ID)
    expect(page['assignError']()).toBe(
      'ID de staff inválido o usuario no encontrado. Verifica con el equipo.',
    );
  });

  it('submitAssign() with fieldErrors → assignedToUserId control gets server error', () => {
    const httpErr = new HttpErrorResponse({
      status: 422,
      statusText: 'Unprocessable Entity',
      error: {
        title: 'Validation Error',
        detail: 'Errores.',
        fieldErrors: [{ field: 'assignedToUserId', message: 'ID de usuario inválido.' }],
      },
    });
    const page = buildSetup({
      assignRequest: vi.fn().mockReturnValue(throwError(() => httpErr)),
    });

    page['assignForm'].controls.assignedToUserId.setValue(1);
    page['submitAssign']();

    expect(page['assignForm'].controls.assignedToUserId.errors?.['server']).toBe(
      'ID de usuario inválido.',
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — S4a: attend/close/cancel/reject action error wiring (UV-8 AC5)
// ---------------------------------------------------------------------------

describe('RequestDetailPage — S4a: attend/close/cancel/reject error wiring (UV-8 AC5)', () => {
  beforeAll(bootstrapTestEnv);
  afterEach(() => TestBed.resetTestingModule());

  it('submitAttend() with HTTP error → attendError set from problem.detail', () => {
    const httpErr = new HttpErrorResponse({
      status: 422,
      statusText: 'Unprocessable Entity',
      error: { title: 'Error', detail: 'Observación requerida.' },
    });
    const page = buildSetup({
      attendRequest: vi.fn().mockReturnValue(throwError(() => httpErr)),
    });

    page['attendForm'].controls.observations.setValue('Valid observations here');
    page['submitAttend']();

    expect(page['attendError']()).toBe('Observación requerida.');
  });

  it('submitClose() with HTTP error → closeError set from problem.detail', () => {
    const httpErr = new HttpErrorResponse({
      status: 422,
      statusText: 'Unprocessable Entity',
      error: { title: 'Error', detail: 'Observación de cierre requerida.' },
    });
    const page = buildSetup({
      closeRequest: vi.fn().mockReturnValue(throwError(() => httpErr)),
    });

    page['closeForm'].controls.closingObservation.setValue('Valid closing observation here');
    page['submitClose']();

    expect(page['closeError']()).toBe('Observación de cierre requerida.');
  });

  it('submitCancel() with HTTP error → cancelError set from problem.detail', () => {
    const httpErr = new HttpErrorResponse({
      status: 422,
      statusText: 'Unprocessable Entity',
      error: { title: 'Error', detail: 'Motivo de cancelación inválido.' },
    });
    const page = buildSetup({
      cancelRequest: vi.fn().mockReturnValue(throwError(() => httpErr)),
    });

    page['cancelForm'].controls.cancellationReason.setValue('Valid cancellation reason here');
    page['submitCancel']();

    expect(page['cancelError']()).toBe('Motivo de cancelación inválido.');
  });

  it('submitReject() with HTTP error → rejectError set from problem.detail', () => {
    const httpErr = new HttpErrorResponse({
      status: 403,
      statusText: 'Forbidden',
      error: { title: 'Forbidden', detail: 'No tiene permisos para rechazar.' },
    });
    const page = buildSetup({
      rejectRequest: vi.fn().mockReturnValue(throwError(() => httpErr)),
    });

    page['rejectForm'].controls.rejectionReason.setValue('Valid rejection reason here');
    page['submitReject']();

    expect(page['rejectError']()).toBe('No tiene permisos para rechazar.');
  });
});

// ---------------------------------------------------------------------------
// Suite 6 — S4a: error signals clear on new submission (UV-8 AC5)
// ---------------------------------------------------------------------------

describe('RequestDetailPage — S4a: errors cleared on retry (UV-8 AC5)', () => {
  beforeAll(bootstrapTestEnv);
  afterEach(() => TestBed.resetTestingModule());

  it('submitClassify() clears classifyError before new request', () => {
    const httpErr = new HttpErrorResponse({
      status: 422,
      statusText: 'Unprocessable Entity',
      error: { title: 'Error', detail: 'Error 1.' },
    });
    const classifyMock = vi
      .fn()
      .mockReturnValueOnce(throwError(() => httpErr))
      .mockReturnValueOnce(of(EMPTY_REQUEST_RESPONSE));

    const page = buildSetup({ classifyRequest: classifyMock });
    page['classifyForm'].controls.requestTypeId.setValue(1);

    // First call sets error
    page['submitClassify']();
    expect(page['classifyError']()).toBe('Error 1.');

    // Second call should clear it (success)
    page['submitClassify']();
    expect(page['classifyError']()).toBeNull();
  });

  it('submitAttend() clears attendError and form server errors before new request', () => {
    const httpErr = new HttpErrorResponse({
      status: 422,
      statusText: 'Unprocessable Entity',
      error: {
        title: 'Error',
        detail: 'Error.',
        fieldErrors: [{ field: 'observations', message: 'Muy corto.' }],
      },
    });
    const attendMock = vi
      .fn()
      .mockReturnValueOnce(throwError(() => httpErr))
      .mockReturnValueOnce(of(EMPTY_REQUEST_RESPONSE));

    const page = buildSetup({ attendRequest: attendMock });
    page['attendForm'].controls.observations.setValue('Long enough observations here');

    // First call sets errors
    page['attendForm'].controls.observations.setValue('Long enough observations here');
    page['submitAttend']();
    expect(page['attendForm'].controls.observations.errors?.['server']).toBe('Muy corto.');

    // Second call clears server errors
    page['attendForm'].controls.observations.setValue('Long enough observations here');
    page['submitAttend']();
    expect(page['attendForm'].controls.observations.errors?.['server']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Suite 7 — S4a: per-action firstError computed helpers (UV-8 AC5)
// ---------------------------------------------------------------------------

describe('RequestDetailPage — S4a: per-action field error computed helpers (UV-8 AC5)', () => {
  beforeAll(bootstrapTestEnv);
  afterEach(() => TestBed.resetTestingModule());

  it('firstClassifyRequestTypeIdError() returns null when control has no errors', () => {
    const page = buildSetup();
    page['classifyForm'].controls.requestTypeId.setValue(1);
    page['classifyForm'].controls.requestTypeId.markAsTouched();

    expect(page['firstClassifyRequestTypeIdError']()).toBeNull();
  });

  it('firstClassifyRequestTypeIdError() returns "Este campo es requerido" when required', () => {
    const page = buildSetup();
    page['classifyForm'].controls.requestTypeId.setValue(null);
    page['classifyForm'].controls.requestTypeId.markAsTouched();

    expect(page['firstClassifyRequestTypeIdError']()).toBe('Este campo es requerido');
  });

  it('firstPrioritizeJustificationError() returns "Este campo es requerido" when empty', () => {
    const page = buildSetup();
    page['prioritizeForm'].controls.justification.setValue('');
    page['prioritizeForm'].controls.justification.markAsTouched();

    expect(page['firstPrioritizeJustificationError']()).toBe('Este campo es requerido');
  });

  it('firstAssignUserIdError() returns "El valor mínimo es 1" for value 0', () => {
    const page = buildSetup();
    page['assignForm'].controls.assignedToUserId.setValue(0);
    page['assignForm'].controls.assignedToUserId.markAsTouched();

    expect(page['firstAssignUserIdError']()).toBe('El valor mínimo es 1');
  });
});

// ---------------------------------------------------------------------------
// Suite 8 — S4a: template source assertions for FormField and ErrorAlert (UV-7, UV-8)
// ---------------------------------------------------------------------------

describe('RequestDetailPage — S4a: template source assertions (UV-7, UV-8)', () => {
  const source = readFileSync(
    new URL('./request-detail-page.ts', import.meta.url).pathname,
    'utf-8',
  );

  it('at-form-field is used in the template (UV-7 AC1)', () => {
    expect(source).toContain('at-form-field');
  });

  it('at-error-alert is used for per-action error display (UV-8 AC5)', () => {
    expect(source).toContain('at-error-alert');
  });

  it('at-error-alert uses variant="error" for action errors (UV-11 AC1)', () => {
    expect(source).toContain('variant="error"');
  });

  it('classifyError signal is bound in the template (UV-8 AC5)', () => {
    expect(source).toContain('classifyError()');
  });

  it('prioritizeError signal is bound in the template (UV-8 AC5)', () => {
    expect(source).toContain('prioritizeError()');
  });

  it('assignError signal is bound in the template (UV-8 AC5)', () => {
    expect(source).toContain('assignError()');
  });

  it('attendError signal is bound in the template (UV-8 AC5)', () => {
    expect(source).toContain('attendError()');
  });

  it('closeError signal is bound in the template (UV-8 AC5)', () => {
    expect(source).toContain('closeError()');
  });

  it('cancelError signal is bound in the template (UV-8 AC5)', () => {
    expect(source).toContain('cancelError()');
  });

  it('rejectError signal is bound in the template (UV-8 AC5)', () => {
    expect(source).toContain('rejectError()');
  });

  it('aria-required binding present for required fields (UV-7 AC3)', () => {
    expect(source).toContain('[attr.aria-required]');
  });

  it('aria-invalid binding present on form inputs (UV-7 AC2)', () => {
    expect(source).toContain('[attr.aria-invalid]');
  });

  it('FormField and ErrorAlert are imported into the component', () => {
    expect(source).toContain('FormField');
    expect(source).toContain('ErrorAlert');
  });
});

// ---------------------------------------------------------------------------
// Suite 9 — S4c: assignment copy/recovery hint (UV-8 AC6)
// ---------------------------------------------------------------------------

describe('RequestDetailPage — S4c: assignment copy/recovery hint (UV-8 AC6)', () => {
  const source = readFileSync(
    new URL('./request-detail-page.ts', import.meta.url).pathname,
    'utf-8',
  );

  it('assignment field has hint copy mentioning numeric ID (UV-8 AC6)', () => {
    // The hint must indicate it is a numeric staff ID
    expect(source).toContain('ID numérico');
  });

  it('assignment field hint mentions upcoming selector (UV-8 AC6 recovery guide)', () => {
    // Recovery guide: future selector coming
    expect(source).toContain('selector');
  });

  it('assignment section has ASSIGN_STAFF_HINT constant or inline hint string (UV-8 AC6)', () => {
    // At minimum the hint text about staff is present in the source
    expect(source).toMatch(/staff.*selector|selector.*staff|ID.*staff|staff.*ID/i);
  });

  it('submitAssign() error handling produces a friendly recovery message (UV-8 AC6)', () => {
    // Source must contain the recovery guidance copy for assignment errors
    expect(source).toContain('ASSIGN_NOT_FOUND_MSG');
  });
});
