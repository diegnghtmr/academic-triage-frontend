/**
 * Tests for RequestCreatePage.assignStudentDefaultChannel.
 *
 * Strategy: instantiate the component class inside TestBed.runInInjectionContext
 * so Angular's injection system wires all dependencies but no DOM rendering occurs.
 * vitest environment is 'node' — DOM-based rendering is intentionally bypassed;
 * this follows the same pattern used in auth.guard.spec.ts and role.guard.spec.ts.
 */
import '@angular/compiler';
import { EnvironmentProviders, provideZonelessChangeDetection, signal } from '@angular/core';
import type { Provider, WritableSignal } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AuthSessionStore } from '@core/auth/auth-session.store';
import type { RoleEnum } from '@core/auth/models/auth-api.types';
import { AiApiService } from '../data-access/ai-api.service';
import { CatalogApiService } from '../data-access/catalog-api.service';
import { RequestsApiService } from '../data-access/requests-api.service';
import type { OriginChannelResponse } from '../models/request-api.types';
import { RequestCreatePage } from './request-create-page';

describe('RequestCreatePage — assignStudentDefaultChannel', () => {
  let roleSig: WritableSignal<RoleEnum | null>;
  let listOriginChannels: ReturnType<typeof vi.fn>;
  let listRequestTypes: ReturnType<typeof vi.fn>;

  beforeAll(() => {
    if (!('document' in globalThis)) {
      // Minimal document stub required by BrowserTestingModule in the node environment.
      // Same pattern used in auth.guard.spec.ts and role.guard.spec.ts.
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

  function setup(role: RoleEnum, channels: OriginChannelResponse[]): RequestCreatePage {
    roleSig = signal<RoleEnum | null>(role);
    listOriginChannels = vi.fn().mockReturnValue(of(channels));
    listRequestTypes = vi.fn().mockReturnValue(of([]));

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection() as unknown as Provider | EnvironmentProviders,
        provideHttpClient(withFetch()),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: AuthSessionStore,
          useValue: { role: roleSig.asReadonly() },
        },
        {
          provide: CatalogApiService,
          useValue: { listOriginChannels, listRequestTypes },
        },
        {
          provide: RequestsApiService,
          useValue: { createRequest: vi.fn() },
        },
        {
          provide: AiApiService,
          useValue: { suggestClassification: vi.fn() },
        },
        RequestCreatePage,
      ],
    });

    // Instantiate via injection context — triggers the constructor forkJoin
    // (resolves synchronously with of()) without rendering the template.
    return TestBed.runInInjectionContext(() => new RequestCreatePage());
  }

  it('STUDENT + matching "Sistema Web" channel → sets originChannelId', () => {
    const page = setup('STUDENT', [
      { id: 7, name: 'Email', active: true },
      { id: 9, name: 'Sistema Web', active: true },
    ]);
    const c = page['form'].controls.originChannelId;
    expect(c.value).toBe(9);
    expect(c.errors).toBeNull();
  });

  it('STUDENT + no matching channel → originChannelId stays null and required error', () => {
    const page = setup('STUDENT', [
      { id: 7, name: 'Email', active: true },
      { id: 8, name: 'Phone', active: true },
    ]);
    const c = page['form'].controls.originChannelId;
    expect(c.value).toBeNull();
    expect(c.errors).toEqual({ required: true });
  });

  it('non-STUDENT (STAFF) → no auto-assign regardless of channels', () => {
    const page = setup('STAFF', [{ id: 9, name: 'Sistema Web', active: true }]);
    const c = page['form'].controls.originChannelId;
    expect(c.value).toBeNull();
  });
});
