/**
 * Tests for RequestListPage — query-param parsing, URL writing, and API integration.
 *
 * Strategy: instantiate the component class inside TestBed.runInInjectionContext
 * so Angular's injection system wires all dependencies but no DOM rendering occurs.
 * vitest environment is 'node' — DOM-based rendering is intentionally bypassed;
 * this follows the same pattern used in users-list-page.spec.ts.
 */
import '@angular/compiler';
import { readFileSync } from 'node:fs';
import { provideZonelessChangeDetection } from '@angular/core';
import type { EnvironmentProviders, Provider } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { convertToParamMap } from '@angular/router';
import type { ParamMap } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { BehaviorSubject, of } from 'rxjs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AuthSessionStore } from '@core/auth/auth-session.store';
import { RequestsApiService } from '../data-access/requests-api.service';
import type { ListRequestsQueryParams } from '../models/request-api.types';
import { RequestListPage } from './request-list-page';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeParamMap(params: Record<string, string>): ParamMap {
  return convertToParamMap(params);
}

// ─── suite ────────────────────────────────────────────────────────────────────

describe('RequestListPage — query-param parsing, URL writing and API integration', () => {
  let queryParams$: BehaviorSubject<ParamMap>;
  let navigateSpy: ReturnType<typeof vi.fn>;
  let listSpy: ReturnType<typeof vi.fn>;

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

  function setup(initialParams: Record<string, string> = {}): RequestListPage {
    queryParams$ = new BehaviorSubject<ParamMap>(makeParamMap(initialParams));
    navigateSpy = vi.fn().mockResolvedValue(true);
    // Echo the requested page back so that load()'s currentPage.set(response.currentPage)
    // does not overwrite the value parsed from queryParams.
    listSpy = vi
      .fn()
      .mockImplementation((q: ListRequestsQueryParams) =>
        of({ content: [], totalPages: 1, currentPage: q.page ?? 0, pageSize: 20 }),
      );

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection() as unknown as Provider | EnvironmentProviders,
        provideHttpClient(withFetch()),
        provideHttpClientTesting(),
        {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          provide: (require('@angular/router') as { ActivatedRoute: unknown }).ActivatedRoute,
          useValue: { queryParamMap: queryParams$.asObservable() },
        },
        {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          provide: (require('@angular/router') as { Router: unknown }).Router,
          useValue: { navigate: navigateSpy },
        },
        {
          provide: RequestsApiService,
          useValue: { listRequests: listSpy },
        },
        {
          provide: AuthSessionStore,
          useValue: { role: () => 'STUDENT' },
        },
        RequestListPage,
      ],
    });

    return TestBed.runInInjectionContext(() => new RequestListPage());
  }

  // ── A. URL → state on init ────────────────────────────────────────────────

  it('A1: no query params → status null, currentPage 0', () => {
    const page = setup({});
    expect(page['filterForm'].controls.status.value).toBeNull();
    expect(page['currentPage']()).toBe(0);
  });

  it('A2: ?status=ATTENDED&page=2 → status ATTENDED, currentPage 2', () => {
    const page = setup({ status: 'ATTENDED', page: '2' });
    expect(page['filterForm'].controls.status.value).toBe('ATTENDED');
    expect(page['currentPage']()).toBe(2);
  });

  it('A3: ?status=INVALID_STATUS → status stays null', () => {
    const page = setup({ status: 'INVALID_STATUS' });
    expect(page['filterForm'].controls.status.value).toBeNull();
  });

  it('A4: ?page=-5 → page falls back to 0', () => {
    const page = setup({ page: '-5' });
    expect(page['currentPage']()).toBe(0);
  });

  it('A5: ?page=abc → page falls back to 0', () => {
    const page = setup({ page: 'abc' });
    expect(page['currentPage']()).toBe(0);
  });

  it('A6: ?status=REGISTERED → status REGISTERED', () => {
    const page = setup({ status: 'REGISTERED' });
    expect(page['filterForm'].controls.status.value).toBe('REGISTERED');
  });

  // ── B. URL writing on actions ─────────────────────────────────────────────

  it('B1: onStatusChange with valid status → navigate with status + page:null', () => {
    const page = setup({});
    navigateSpy.mockClear();
    page['onStatusChange']('ATTENDED');

    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { status: 'ATTENDED', page: null },
        queryParamsHandling: 'merge',
      }),
    );
  });

  it('B2: onStatusChange with empty string → navigate with status:null + page:null', () => {
    const page = setup({ status: 'CLOSED' });
    navigateSpy.mockClear();
    page['onStatusChange']('');

    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { status: null, page: null },
        queryParamsHandling: 'merge',
      }),
    );
  });

  it('B3: applyFilters → navigate with current form status + page:null', () => {
    const page = setup({ status: 'IN_PROGRESS' });
    navigateSpy.mockClear();
    page['applyFilters']();

    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { status: 'IN_PROGRESS', page: null },
        queryParamsHandling: 'merge',
      }),
    );
  });

  it('B4: prevPage from page 3 → navigates with {page: 2}', () => {
    const page = setup({ page: '3' });
    navigateSpy.mockClear();
    page['prevPage']();

    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { page: 2 },
        queryParamsHandling: 'merge',
      }),
    );
  });

  it('B5: prevPage from page 1 → navigates with {page: null} (page 0 omitted)', () => {
    const page = setup({ page: '1' });
    navigateSpy.mockClear();
    page['prevPage']();

    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { page: null },
        queryParamsHandling: 'merge',
      }),
    );
  });

  it('B6: nextPage from page 0 → navigates with {page: 1}', () => {
    const page = setup({});
    navigateSpy.mockClear();
    page['nextPage']();

    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { page: 1 },
        queryParamsHandling: 'merge',
      }),
    );
  });

  // ── C. API integration ────────────────────────────────────────────────────

  it('C1: no filters → listRequests called with page/size/sort only (no status key)', () => {
    setup({});

    const callArg: ListRequestsQueryParams = listSpy.mock.calls[0][0];
    expect(callArg.page).toBe(0);
    expect(callArg.size).toBe(20);
    expect(callArg.sort).toBe('registrationDateTime,desc');
    expect('status' in callArg).toBe(false);
  });

  it('C2: ?status=REGISTERED&page=1 → listRequests called with status and page', () => {
    setup({ status: 'REGISTERED', page: '1' });

    const callArg: ListRequestsQueryParams = listSpy.mock.calls[0][0];
    expect(callArg.page).toBe(1);
    expect(callArg.size).toBe(20);
    expect(callArg.sort).toBe('registrationDateTime,desc');
    expect(callArg.status).toBe('REGISTERED');
  });

  it('C3: queryParams change mid-session triggers new listRequests call', () => {
    setup({ status: 'ATTENDED' });
    const callsBefore = listSpy.mock.calls.length;

    queryParams$.next(makeParamMap({ status: 'CLOSED', page: '2' }));

    expect(listSpy.mock.calls.length).toBeGreaterThan(callsBefore);
    const lastCallArg: ListRequestsQueryParams =
      listSpy.mock.calls[listSpy.mock.calls.length - 1][0];
    expect(lastCallArg.status).toBe('CLOSED');
    expect(lastCallArg.page).toBe(2);
  });
});

// ── Suite D — S3/W-1: empty-state source assertions (UV-11.S2) ───────────────

describe('RequestListPage — S3/W-1: empty-state template source assertion (UV-11.S2)', () => {
  const source = readFileSync(
    new URL('./request-list-page.ts', import.meta.url).pathname,
    'utf-8',
  );

  it('template contains at-empty-state element (UV-11.S2)', () => {
    expect(source).toContain('at-empty-state');
  });

  it('at-empty-state is conditional on !loading() && rows().length === 0 (UV-11.S2)', () => {
    // The empty-state render condition must check both loading=false AND rows empty.
    expect(source).toContain('!loading()');
    expect(source).toContain('rows().length === 0');
  });

  it('at-empty-state has a message input binding or attribute (UV-11.S2)', () => {
    expect(source).toContain('message=');
  });

  it('EmptyState is imported into the component (UV-11.S2)', () => {
    expect(source).toContain('EmptyState');
  });
});
