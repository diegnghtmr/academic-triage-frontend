/**
 * Tests for BusinessRulesListPage — query-param parsing, URL writing, and API integration.
 *
 * Strategy: instantiate the component class inside TestBed.runInInjectionContext
 * so Angular's injection system wires all dependencies but no DOM rendering occurs.
 * vitest environment is 'node' — DOM-based rendering is intentionally bypassed.
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
import { BehaviorSubject, of } from 'rxjs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AuthSessionStore } from '@core/auth/auth-session.store';
import { BusinessRulesApiService } from '../data-access/business-rules-api.service';
import { BusinessRulesListPage } from './business-rules-list-page';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeParamMap(params: Record<string, string>): ParamMap {
  return convertToParamMap(params);
}

// ─── suite ────────────────────────────────────────────────────────────────────

describe('BusinessRulesListPage — query-param parsing, URL writing and API integration', () => {
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

  function setup(initialParams: Record<string, string> = {}): BusinessRulesListPage {
    queryParams$ = new BehaviorSubject<ParamMap>(makeParamMap(initialParams));
    navigateSpy = vi.fn().mockResolvedValue(true);
    listSpy = vi.fn().mockReturnValue(of([]));

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection() as unknown as Provider | EnvironmentProviders,
        provideHttpClient(withFetch()),
        provideHttpClientTesting(),
        {
          provide: (
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require('@angular/router') as { ActivatedRoute: unknown }
          ).ActivatedRoute,
          useValue: { queryParamMap: queryParams$.asObservable() },
        },
        {
          provide: (
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require('@angular/router') as { Router: unknown }
          ).Router,
          useValue: { navigate: navigateSpy },
        },
        {
          provide: BusinessRulesApiService,
          useValue: { list: listSpy, delete: vi.fn().mockReturnValue(of(undefined)) },
        },
        {
          provide: AuthSessionStore,
          useValue: { role: () => 'STAFF' },
        },
        BusinessRulesListPage,
      ],
    });

    return TestBed.runInInjectionContext(() => new BusinessRulesListPage());
  }

  // ── A. Init: param parsing → showInactive signal ──────────────────────────

  it('A1: no params → showInactive=false, API called with { active: true }', () => {
    const page = setup({});
    expect(page['showInactive']()).toBe(false);
    expect(listSpy).toHaveBeenCalledWith({ active: true });
  });

  it('A2: ?inactive=true → showInactive=true, API called without active key', () => {
    setup({ inactive: 'true' });
    const callArg: Parameters<BusinessRulesApiService['list']>[0] =
      listSpy.mock.calls[0][0];
    expect(callArg).toBeUndefined();
  });

  it('A2-signal: ?inactive=true → showInactive signal is true', () => {
    const page = setup({ inactive: 'true' });
    expect(page['showInactive']()).toBe(true);
  });

  it('A3: ?inactive=garbage → showInactive=false (defensive parsing)', () => {
    const page = setup({ inactive: 'garbage' });
    expect(page['showInactive']()).toBe(false);
    expect(listSpy).toHaveBeenCalledWith({ active: true });
  });

  // ── B. toggleFilter → URL navigation ─────────────────────────────────────

  it('B1: toggleFilter() from false → navigates with { inactive: "true" }', () => {
    const page = setup({});
    navigateSpy.mockClear();
    page['toggleFilter']();

    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { inactive: 'true' },
        queryParamsHandling: 'merge',
      }),
    );
  });

  it('B2: toggleFilter() from true → navigates with { inactive: null }', () => {
    const page = setup({ inactive: 'true' });
    navigateSpy.mockClear();
    page['toggleFilter']();

    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { inactive: null },
        queryParamsHandling: 'merge',
      }),
    );
  });

  // ── C. queryParams stream triggers reload ─────────────────────────────────

  it('C1: queryParams change mid-session triggers new list call', () => {
    setup({});
    const callsBefore = listSpy.mock.calls.length;

    queryParams$.next(makeParamMap({ inactive: 'true' }));

    expect(listSpy.mock.calls.length).toBeGreaterThan(callsBefore);
    const lastCallArg: Parameters<BusinessRulesApiService['list']>[0] =
      listSpy.mock.calls[listSpy.mock.calls.length - 1][0];
    expect(lastCallArg).toBeUndefined();
  });
});
