/**
 * Tests for OriginChannelsListPage — query-param parsing and URL writing.
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
import { OriginChannelsListPage } from './origin-channels-list-page';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeParamMap(params: Record<string, string>): ParamMap {
  return convertToParamMap(params);
}

// ─── suite ────────────────────────────────────────────────────────────────────

describe('OriginChannelsListPage — query-param parsing and URL writing', () => {
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

  function setup(initialParams: Record<string, string> = {}): OriginChannelsListPage {
    queryParams$ = new BehaviorSubject<ParamMap>(makeParamMap(initialParams));
    navigateSpy = vi.fn().mockResolvedValue(true);
    listSpy = vi.fn().mockReturnValue(of([]));

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
          provide: CatalogAdminApiService,
          useValue: { listOriginChannels: listSpy },
        },
        OriginChannelsListPage,
      ],
    });

    return TestBed.runInInjectionContext(() => new OriginChannelsListPage());
  }

  // ── A. Init from query params ─────────────────────────────────────────────

  it('A1: no query params → showInactive is false', () => {
    const page = setup({});
    expect(page['showInactive']()).toBe(false);
  });

  it('A2: ?inactive=true → showInactive is true', () => {
    const page = setup({ inactive: 'true' });
    expect(page['showInactive']()).toBe(true);
  });

  it('A3: ?inactive=garbage → showInactive stays false', () => {
    const page = setup({ inactive: 'garbage' });
    expect(page['showInactive']()).toBe(false);
  });

  // ── B. Toggle URL writing ─────────────────────────────────────────────────

  it('B1: toggleFilter when showInactive is false → navigate with inactive: "true"', () => {
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

  it('B2: toggleFilter when showInactive is true → navigate with inactive: null', () => {
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

  // ── C. API integration ────────────────────────────────────────────────────

  it('C1: no ?inactive → listOriginChannels called with active=true', () => {
    setup({});
    expect(listSpy).toHaveBeenCalledWith(true);
  });

  it('C2: ?inactive=true → listOriginChannels called with active=undefined', () => {
    setup({ inactive: 'true' });
    expect(listSpy).toHaveBeenCalledWith(undefined);
  });
});
