import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import type { UrlTree } from '@angular/router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { authGuard } from './auth.guard';
import { AuthSessionStore } from './auth-session.store';

describe('authGuard', () => {
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
      // Environment already initialized by another spec file.
    }
  });

  const createUrlTree = vi.fn<[commands: unknown[], extras?: unknown], UrlTree>();
  const isAuthenticated = vi.fn<[], boolean>();

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(() => {
    createUrlTree.mockReset();
    isAuthenticated.mockReset();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: Router,
          useValue: {
            createUrlTree,
          } satisfies Pick<Router, 'createUrlTree'>,
        },
        {
          provide: AuthSessionStore,
          useValue: {
            isAuthenticated,
          } satisfies Pick<AuthSessionStore, 'isAuthenticated'>,
        },
      ],
    });
  });

  it('allows navigation when user is authenticated', () => {
    isAuthenticated.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/app' } as never),
    );

    expect(result).toBe(true);
    expect(createUrlTree).not.toHaveBeenCalled();
  });

  it('redirects to login with returnUrl when user is unauthenticated', () => {
    const redirectTree = {} as UrlTree;
    isAuthenticated.mockReturnValue(false);
    createUrlTree.mockReturnValue(redirectTree);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/app/admin' } as never),
    );

    expect(result).toBe(redirectTree);
    expect(createUrlTree).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { returnUrl: '/app/admin' },
    });
  });
});
