import '@angular/compiler';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AuthSessionStore } from '@core/auth/auth-session.store';
import { API_BASE_URL } from '@core/http/api-base-url.token';
import { apiBaseUrlInterceptor } from './api-base-url.interceptor';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor (with apiBaseUrlInterceptor)', () => {
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

  function configure(apiBaseUrl: string, tokenValue: string | null): void {
    const tokenSig = signal(tokenValue);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: API_BASE_URL, useValue: apiBaseUrl },
        {
          provide: AuthSessionStore,
          useValue: {
            token: tokenSig.asReadonly(),
          } satisfies Pick<AuthSessionStore, 'token'>,
        },
        provideHttpClient(withInterceptors([apiBaseUrlInterceptor, authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
  }

  beforeEach(() => {
    configure('/api/v1', 'fixture-jwt-token');
  });

  it('adjunta Bearer para tráfico relativo reescrito a la base API mismo-origen', () => {
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    http.get('requests').subscribe((data) => {
      expect(data).toEqual({ ok: true });
    });

    const req = controller.expectOne('/api/v1/requests');
    expect(req.request.headers.get('Authorization')).toBe(
      'Bearer fixture-jwt-token',
    );
    req.flush({ ok: true });

    controller.verify();
  });

  it('adjunta Bearer para URL absoluta bajo API_BASE_URL configurado (origen aparte)', () => {
    TestBed.resetTestingModule();
    configure('https://api.example.edu/api/v1', 'absolute-base-token');

    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    http.get('reports/summary').subscribe();

    const req = controller.expectOne(
      'https://api.example.edu/api/v1/reports/summary',
    );
    expect(req.request.headers.get('Authorization')).toBe(
      'Bearer absolute-base-token',
    );
    req.flush({});

    controller.verify();
  });

  it('omite Bearer para URL absoluta a terceros (pasa intacta tras apiBaseUrlInterceptor)', () => {
    TestBed.resetTestingModule();
    configure('/api/v1', 'should-not-send');

    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    http.get('https://cdn.other.example/ping').subscribe();

    const req = controller.expectOne('https://cdn.other.example/ping');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});

    controller.verify();
  });

  it('no adjunta Authorization cuando no hay token', () => {
    TestBed.resetTestingModule();
    configure('/api/v1', null);

    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    http.get('requests').subscribe();

    const req = controller.expectOne('/api/v1/requests');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
    controller.verify();
  });

  it('no adjunta Authorization cuando el token está vacío', () => {
    TestBed.resetTestingModule();
    configure('/api/v1', '');

    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    http.get('requests').subscribe();

    const req = controller.expectOne('/api/v1/requests');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
    controller.verify();
  });

  it('normaliza slash final en API_BASE_URL al comparar orígenes absolutos', () => {
    TestBed.resetTestingModule();
    configure('https://api.example.edu/api/v1/', 'token-with-slash-base');

    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    http.get('me').subscribe();

    const req = controller.expectOne('https://api.example.edu/api/v1/me');
    expect(req.request.headers.get('Authorization')).toBe(
      'Bearer token-with-slash-base',
    );
    req.flush({});
    controller.verify();
  });
});
