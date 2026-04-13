import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import type { UrlTree } from '@angular/router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { guestGuard } from './guest.guard';
import { AuthSessionStore } from './auth-session.store';

describe('guestGuard', () => {
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

  it('redirects to /app when user is authenticated', () => {
    const redirectTree = {} as UrlTree;
    isAuthenticated.mockReturnValue(true);
    createUrlTree.mockReturnValue(redirectTree);

    const result = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));

    expect(result).toBe(redirectTree);
    expect(createUrlTree).toHaveBeenCalledWith(['/app']);
  });

  it('allows navigation when user is not authenticated', () => {
    isAuthenticated.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));

    expect(result).toBe(true);
    expect(createUrlTree).not.toHaveBeenCalled();
  });
});
