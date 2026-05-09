/**
 * Tests for RequestTypesListPage — query-param parsing and URL writing.
 *
 * Strategy: instantiate the component class inside TestBed.runInInjectionContext
 * so Angular's injection system wires all dependencies but no DOM rendering occurs.
 * vitest environment is 'node' — DOM-based rendering is intentionally bypassed;
 * this follows the same pattern used in users-list-page.spec.ts.
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

import { CatalogAdminApiService } from '../data-access/catalog-admin-api.service';
import { RequestTypesListPage } from './request-types-list-page';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeParamMap(params: Record<string, string>): ParamMap {
  return convertToParamMap(params);
}

// ─── suite ────────────────────────────────────────────────────────────────────

describe('RequestTypesListPage — query-param parsing and URL writing', () => {
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

  function setup(initialParams: Record<string, string> = {}): RequestTypesListPage {
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
          provide: CatalogAdminApiService,
          useValue: { listRequestTypes: listSpy },
        },
        RequestTypesListPage,
      ],
    });

    return TestBed.runInInjectionContext(() => new RequestTypesListPage());
  }

  // ── A. Init — query-param parsing ────────────────────────────────────────

  it('A1: no params → showInactive false, API called with active=true', () => {
    setup({});

    expect(listSpy).toHaveBeenCalledWith(true);
  });

  it('A2: ?inactive=true → showInactive true, API called with active=undefined', () => {
    const page = setup({ inactive: 'true' });

    expect(page['showInactive']()).toBe(true);
    expect(listSpy).toHaveBeenCalledWith(undefined);
  });

  it('A3: ?inactive=garbage → showInactive false (only "true" is true), API called with active=true', () => {
    const page = setup({ inactive: 'garbage' });

    expect(page['showInactive']()).toBe(false);
    expect(listSpy).toHaveBeenCalledWith(true);
  });

  // ── B. Toggle — URL writing ───────────────────────────────────────────────

  it('B1: toggle false→true → navigate with {inactive: "true"}', () => {
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

  it('B2: toggle true→false → navigate with {inactive: null} (param removed)', () => {
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
});
