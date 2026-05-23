/**
 * Tests for UsersListPage — query-param parsing, URL writing, and API integration.
 *
 * Strategy: instantiate the component class inside TestBed.runInInjectionContext
 * so Angular's injection system wires all dependencies but no DOM rendering occurs.
 * vitest environment is 'node' — DOM-based rendering is intentionally bypassed;
 * this follows the same pattern used in request-create-page.spec.ts.
 */
import '@angular/compiler';
import { EnvironmentProviders, provideZonelessChangeDetection } from '@angular/core';
import type { Provider } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { convertToParamMap } from '@angular/router';
import type { ParamMap } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { BehaviorSubject } from 'rxjs';
import { of } from 'rxjs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { UsersApiService } from '../data-access/users-api.service';
import type { ListUsersQueryParams } from '../models/user-admin.types';
import { UsersListPage } from './users-list-page';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeParamMap(params: Record<string, string>): ParamMap {
  return convertToParamMap(params);
}

// ─── suite ────────────────────────────────────────────────────────────────────

describe('UsersListPage — query-param parsing, URL writing and API integration', () => {
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

  function setup(initialParams: Record<string, string> = {}): UsersListPage {
    queryParams$ = new BehaviorSubject<ParamMap>(makeParamMap(initialParams));
    navigateSpy = vi.fn().mockResolvedValue(true);
    // Echo the requested page back so that load()'s currentPage.set(response.currentPage)
    // does not overwrite the value parsed from queryParams.
    listSpy = vi
      .fn()
      .mockImplementation((q: ListUsersQueryParams) =>
        of({ content: [], totalPages: 1, currentPage: q.page ?? 0, pageSize: 20 }),
      );

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection() as unknown as Provider | EnvironmentProviders,
        provideHttpClient(withFetch()),
        provideHttpClientTesting(),
        {
          provide: 'ActivatedRoute',
          useValue: { queryParamMap: queryParams$.asObservable() },
        },
        // ActivatedRoute token used by the component via inject()
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
          provide: UsersApiService,
          useValue: { list: listSpy },
        },
        UsersListPage,
      ],
    });

    return TestBed.runInInjectionContext(() => new UsersListPage());
  }

  // ── A. Pure parser helpers via observable behavior ────────────────────────

  it('A1: no query params → form {role: null, active: null}, currentPage 0', () => {
    const page = setup({});
    expect(page['filterForm'].getRawValue()).toEqual({ role: null, active: null });
    expect(page['currentPage']()).toBe(0);
  });

  it('A2: ?role=ADMIN&active=true&page=2 → form {role: ADMIN, active: true}, currentPage 2', () => {
    const page = setup({ role: 'ADMIN', active: 'true', page: '2' });
    expect(page['filterForm'].getRawValue()).toEqual({ role: 'ADMIN', active: true });
    expect(page['currentPage']()).toBe(2);
  });

  it('A3: ?role=GARBAGE → role stays null', () => {
    const page = setup({ role: 'GARBAGE' });
    expect(page['filterForm'].controls.role.value).toBeNull();
  });

  it('A4: ?active=lol → active stays null', () => {
    const page = setup({ active: 'lol' });
    expect(page['filterForm'].controls.active.value).toBeNull();
  });

  it('A5: ?page=-5 → page falls back to 0', () => {
    const page = setup({ page: '-5' });
    expect(page['currentPage']()).toBe(0);
  });

  it('A6: ?page=abc → page falls back to 0', () => {
    const page = setup({ page: 'abc' });
    expect(page['currentPage']()).toBe(0);
  });

  // ── B. URL writing on actions ─────────────────────────────────────────────

  it('B1: applyFilters with {role: STAFF, active: true} → navigate with role/active/page:null', () => {
    const page = setup({});
    page['filterForm'].setValue({ role: 'STAFF', active: true });
    page['applyFilters']();

    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { role: 'STAFF', active: 'true', page: null },
        queryParamsHandling: 'merge',
      }),
    );
  });

  it('B2: clearFilter → navigate with {role: null, active: null, page: null}', () => {
    const page = setup({ role: 'ADMIN' });
    navigateSpy.mockClear();
    page['clearFilter']();

    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { role: null, active: null, page: null },
        queryParamsHandling: 'merge',
      }),
    );
  });

  it('B3: prevPage from page 3 → navigates with {page: 2}', () => {
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

  it('B4: prevPage from page 1 → navigates with {page: null} (page 0 omitted)', () => {
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

  it('B5: nextPage from page 0 → navigates with {page: 1}', () => {
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

  it('C1: no filters → list called with page/size/sort only (no role/active keys)', () => {
    setup({});

    const callArg: ListUsersQueryParams = listSpy.mock.calls[0][0];
    expect(callArg.page).toBe(0);
    expect(callArg.size).toBe(20);
    expect(callArg.sort).toBe('username,asc');
    expect('role' in callArg).toBe(false);
    expect('active' in callArg).toBe(false);
  });

  it('C2: ?role=ADMIN&active=true&page=1 → list called with all params including role/active', () => {
    setup({ role: 'ADMIN', active: 'true', page: '1' });

    const callArg: ListUsersQueryParams = listSpy.mock.calls[0][0];
    expect(callArg.page).toBe(1);
    expect(callArg.size).toBe(20);
    expect(callArg.sort).toBe('username,asc');
    expect(callArg.role).toBe('ADMIN');
    expect(callArg.active).toBe(true);
  });

  it('C3: queryParams change mid-session triggers new list call', () => {
    setup({ role: 'STAFF' });
    const callsBefore = listSpy.mock.calls.length;

    queryParams$.next(makeParamMap({ role: 'STUDENT', page: '2' }));

    expect(listSpy.mock.calls.length).toBeGreaterThan(callsBefore);
    const lastCallArg: ListUsersQueryParams = listSpy.mock.calls[listSpy.mock.calls.length - 1][0];
    expect(lastCallArg.role).toBe('STUDENT');
    expect(lastCallArg.page).toBe(2);
  });
});
