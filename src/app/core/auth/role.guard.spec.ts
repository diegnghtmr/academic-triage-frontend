import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import type { ActivatedRouteSnapshot, UrlTree } from '@angular/router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { roleGuard } from './role.guard';
import { AuthSessionStore } from './auth-session.store';
import type { RoleEnum } from './models/auth-api.types';

function createRouteSnapshot(roles?: RoleEnum[]): ActivatedRouteSnapshot {
  return {
    data: roles === undefined ? {} : { roles },
  } as ActivatedRouteSnapshot;
}

/** Adversarial helper — accepts any shape so we can pass invalid values. */
function createRouteSnapshotRaw(roles: unknown): ActivatedRouteSnapshot {
  return { data: { roles } } as unknown as ActivatedRouteSnapshot;
}

describe('roleGuard', () => {
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
  const role = vi.fn<[], RoleEnum | null>();

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(() => {
    createUrlTree.mockReset();
    role.mockReset();

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
            role,
          } satisfies Pick<AuthSessionStore, 'role'>,
        },
      ],
    });
  });

  it('allows when route does not define roles', () => {
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(createRouteSnapshot(), {} as never),
    );

    expect(result).toBe(true);
    expect(role).not.toHaveBeenCalled();
    expect(createUrlTree).not.toHaveBeenCalled();
  });

  it('allows when route defines an empty roles list', () => {
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(createRouteSnapshot([]), {} as never),
    );

    expect(result).toBe(true);
    expect(role).not.toHaveBeenCalled();
    expect(createUrlTree).not.toHaveBeenCalled();
  });

  it('redirects to login when role is null and route requires roles', () => {
    const redirectTree = {} as UrlTree;
    role.mockReturnValue(null);
    createUrlTree.mockReturnValue(redirectTree);

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(createRouteSnapshot(['ADMIN']), {} as never),
    );

    expect(result).toBe(redirectTree);
    expect(createUrlTree).toHaveBeenCalledWith(['/auth/login']);
  });

  it('redirects to /app when role is not allowed', () => {
    const redirectTree = {} as UrlTree;
    role.mockReturnValue('STUDENT');
    createUrlTree.mockReturnValue(redirectTree);

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(createRouteSnapshot(['ADMIN', 'STAFF']), {} as never),
    );

    expect(result).toBe(redirectTree);
    expect(createUrlTree).toHaveBeenCalledWith(['/app']);
  });

  it('allows when role is included in allowed roles', () => {
    role.mockReturnValue('STAFF');

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(createRouteSnapshot(['ADMIN', 'STAFF']), {} as never),
    );

    expect(result).toBe(true);
    expect(createUrlTree).not.toHaveBeenCalled();
  });

  // Adversarial shape-validation cases — invalid data.roles shapes must redirect to /app (fail closed).

  it('redirects to /app when data.roles is a plain string (not an array)', () => {
    const redirectTree = {} as UrlTree;
    role.mockReturnValue('ADMIN');
    createUrlTree.mockReturnValue(redirectTree);

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(createRouteSnapshotRaw('ADMIN'), {} as never),
    );

    expect(result).toBe(redirectTree);
    expect(createUrlTree).toHaveBeenCalledWith(['/app']);
  });

  it('redirects to /app when data.roles contains an unknown role value (ROOT)', () => {
    const redirectTree = {} as UrlTree;
    role.mockReturnValue('ADMIN');
    createUrlTree.mockReturnValue(redirectTree);

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(createRouteSnapshotRaw(['ADMIN', 'ROOT']), {} as never),
    );

    expect(result).toBe(redirectTree);
    expect(createUrlTree).toHaveBeenCalledWith(['/app']);
  });

  it('redirects to /app when data.roles contains a null element', () => {
    const redirectTree = {} as UrlTree;
    role.mockReturnValue('ADMIN');
    createUrlTree.mockReturnValue(redirectTree);

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(createRouteSnapshotRaw([null]), {} as never),
    );

    expect(result).toBe(redirectTree);
    expect(createUrlTree).toHaveBeenCalledWith(['/app']);
  });
});
