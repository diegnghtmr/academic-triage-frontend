import '@angular/compiler';
import {
  provideHttpClient,
  withInterceptors,
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { Router } from '@angular/router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthSessionStore } from '@core/auth/auth-session.store';
import { httpErrorInterceptor } from './http-error.interceptor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildTestBed(
  clearSession: ReturnType<typeof vi.fn>,
  navigateByUrl: ReturnType<typeof vi.fn>,
  routerUrl = '/app/dashboard',
): void {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(withInterceptors([httpErrorInterceptor])),
      provideHttpClientTesting(),
      {
        provide: AuthSessionStore,
        useValue: {
          clearSession,
        } satisfies Pick<AuthSessionStore, 'clearSession'>,
      },
      {
        provide: Router,
        useValue: {
          url: routerUrl,
          navigateByUrl,
        } satisfies Pick<Router, 'url' | 'navigateByUrl'>,
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('httpErrorInterceptor', () => {
  beforeAll(() => {
    if (!('document' in globalThis)) {
      Object.defineProperty(globalThis, 'document', {
        value: {},
        configurable: true,
      });
    }
    try {
      TestBed.initTestEnvironment(
        BrowserTestingModule,
        platformBrowserTesting(),
      );
    } catch {
      // Already initialized.
    }
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('clears session and navigates to /auth/login on 401 for a protected endpoint', () => {
    const clearSession = vi.fn();
    const navigateByUrl = vi.fn<[string], Promise<boolean>>().mockResolvedValue(true);

    buildTestBed(clearSession, navigateByUrl, '/app/requests/list');

    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    let errorReceived: HttpErrorResponse | undefined;
    http.get('/api/v1/requests').subscribe({
      error: (err: HttpErrorResponse) => {
        errorReceived = err;
      },
    });

    controller.expectOne('/api/v1/requests').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(clearSession).toHaveBeenCalledOnce();
    expect(navigateByUrl).toHaveBeenCalledOnce();
    const navArg: string = navigateByUrl.mock.calls[0][0];
    expect(navArg).toContain('/auth/login');
    expect(navArg).toContain('returnUrl=');
    // Error must be re-thrown (not swallowed).
    expect(errorReceived?.status).toBe(401);

    controller.verify();
  });

  it('does NOT clear session or navigate on 401 for /auth/login (bad credentials)', () => {
    const clearSession = vi.fn();
    const navigateByUrl = vi.fn<[string], Promise<boolean>>().mockResolvedValue(true);

    buildTestBed(clearSession, navigateByUrl, '/auth/login');

    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    let errorReceived: HttpErrorResponse | undefined;
    http.post('/api/v1/auth/login', {}).subscribe({
      error: (err: HttpErrorResponse) => {
        errorReceived = err;
      },
    });

    controller
      .expectOne('/api/v1/auth/login')
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(clearSession).not.toHaveBeenCalled();
    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(errorReceived?.status).toBe(401);

    controller.verify();
  });

  it('does not interfere on 200 responses for a protected endpoint', () => {
    const clearSession = vi.fn();
    const navigateByUrl = vi.fn<[string], Promise<boolean>>().mockResolvedValue(true);

    buildTestBed(clearSession, navigateByUrl, '/app/requests/list');

    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    let responseData: unknown;
    http.get('/api/v1/requests').subscribe((data) => {
      responseData = data;
    });

    controller.expectOne('/api/v1/requests').flush([{ id: 1 }]);

    expect(clearSession).not.toHaveBeenCalled();
    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(responseData).toEqual([{ id: 1 }]);

    controller.verify();
  });

  it('does not clear session or navigate on 500 (re-throws the error)', () => {
    const clearSession = vi.fn();
    const navigateByUrl = vi.fn<[string], Promise<boolean>>().mockResolvedValue(true);

    buildTestBed(clearSession, navigateByUrl, '/app/requests/list');

    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    let errorReceived: HttpErrorResponse | undefined;
    http.get('/api/v1/requests').subscribe({
      error: (err: HttpErrorResponse) => {
        errorReceived = err;
      },
    });

    controller
      .expectOne('/api/v1/requests')
      .flush(null, { status: 500, statusText: 'Internal Server Error' });

    expect(clearSession).not.toHaveBeenCalled();
    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(errorReceived?.status).toBe(500);

    controller.verify();
  });
});
