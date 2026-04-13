import '@angular/compiler';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { AuthResponse, LoginRequest } from '@core/auth/models/auth-api.types';
import { AuthApiService } from './auth-api.service';

describe('AuthApiService', () => {
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
      // Already initialized by another spec.
    }
  });

  let service: AuthApiService;
  let httpController: HttpTestingController;

  afterEach(() => {
    httpController.verify();
    TestBed.resetTestingModule();
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthApiService,
      ],
    });
    service = TestBed.inject(AuthApiService);
    httpController = TestBed.inject(HttpTestingController);
  });

  // ── canonical identifier payload ─────────────────────────────────────────

  it('login must POST body with canonical identifier field', () => {
    const body: LoginRequest = { identifier: 'jperez', password: 'MyPassword123' };
    const mockResponse: AuthResponse = {
      token: 'jwt-token',
      tokenType: 'Bearer',
      expiresIn: 86400,
      user: { username: 'jperez', role: 'STUDENT' },
    };

    service.login(body).subscribe((res) => {
      expect(res.token).toBe('jwt-token');
    });

    const req = httpController.expectOne('auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ identifier: 'jperez', password: 'MyPassword123' });
    expect(req.request.body).not.toHaveProperty('username', expect.any(String));
    req.flush(mockResponse);
  });

  it('login must POST body with email as canonical identifier', () => {
    const body: LoginRequest = {
      identifier: 'jperez@uniquindio.edu.co',
      password: 'MyPassword123',
    };

    service.login(body).subscribe();

    const req = httpController.expectOne('auth/login');
    expect(req.request.body['identifier']).toBe('jperez@uniquindio.edu.co');
    expect(req.request.body['username']).toBeUndefined();
    req.flush({});
  });

  // ── backward compatibility alias path (tooling/tests only) ───────────────

  it('login allows optional username alias alongside identifier when same value (compat mode)', () => {
    const body: LoginRequest = {
      identifier: 'jperez',
      username: 'jperez',
      password: 'MyPassword123',
    };

    service.login(body).subscribe();

    const req = httpController.expectOne('auth/login');
    expect(req.request.body['identifier']).toBe('jperez');
    expect(req.request.body['username']).toBe('jperez');
    req.flush({});
  });

  // ── type safety: LoginRequest must have identifier as required ───────────

  it('LoginRequest type must have identifier as required field', () => {
    const body: LoginRequest = { identifier: 'jperez', password: 'pass1234' };
    // TypeScript compile check — identifier must be assignable as required string
    expect(body.identifier).toBe('jperez');
    expect(body.username).toBeUndefined();
  });
});
