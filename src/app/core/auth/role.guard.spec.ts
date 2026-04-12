import { describe, expect, it } from 'vitest';

import type { RoleEnum } from './models/auth-api.types';

/**
 * Decision logic of `roleGuard` — validated as pure function.
 *
 * The actual guard wires this logic to `AuthSessionStore`, `Router`, and `ActivatedRouteSnapshot`
 * via `inject()`. Angular DI integration is covered by E2E smoke tests (`e2e/role-access.spec.ts`).
 *
 * Contract (from `src/app/core/auth/role.guard.ts`):
 *   - No `roles` array in route data (undefined / empty) → allow (neutral guard)
 *   - Role is null (session cleared)                    → redirect to `/auth/login`
 *   - Role not in allowed list                          → redirect to `/app`
 *   - Role is in allowed list                           → allow
 */

type RoleGuardOutcome = 'allow' | 'redirect-login' | 'redirect-app';

function resolveRoleGuard(
  allowed: RoleEnum[] | undefined,
  role: RoleEnum | null,
): RoleGuardOutcome {
  if (allowed === undefined || allowed.length === 0) return 'allow';
  if (role === null) return 'redirect-login';
  if (!allowed.includes(role)) return 'redirect-app';
  return 'allow';
}

describe('roleGuard decision logic', () => {
  describe('no roles configured (neutral guard)', () => {
    it('allows when allowed list is undefined', () => {
      expect(resolveRoleGuard(undefined, 'ADMIN')).toBe('allow');
    });

    it('allows when allowed list is empty', () => {
      expect(resolveRoleGuard([], 'STAFF')).toBe('allow');
    });
  });

  describe('role is null (session cleared mid-navigation)', () => {
    it('redirects to login when no session and roles are required', () => {
      expect(resolveRoleGuard(['ADMIN'], null)).toBe('redirect-login');
      expect(resolveRoleGuard(['ADMIN', 'STAFF'], null)).toBe('redirect-login');
    });
  });

  describe('ADMIN-only routes', () => {
    const adminOnly: RoleEnum[] = ['ADMIN'];

    it('allows ADMIN', () => {
      expect(resolveRoleGuard(adminOnly, 'ADMIN')).toBe('allow');
    });

    it('redirects STAFF to /app', () => {
      expect(resolveRoleGuard(adminOnly, 'STAFF')).toBe('redirect-app');
    });

    it('redirects STUDENT to /app', () => {
      expect(resolveRoleGuard(adminOnly, 'STUDENT')).toBe('redirect-app');
    });
  });

  describe('ADMIN + STAFF routes (business-rules)', () => {
    const adminOrStaff: RoleEnum[] = ['ADMIN', 'STAFF'];

    it('allows ADMIN', () => {
      expect(resolveRoleGuard(adminOrStaff, 'ADMIN')).toBe('allow');
    });

    it('allows STAFF', () => {
      expect(resolveRoleGuard(adminOrStaff, 'STAFF')).toBe('allow');
    });

    it('redirects STUDENT to /app', () => {
      expect(resolveRoleGuard(adminOrStaff, 'STUDENT')).toBe('redirect-app');
    });
  });

  describe('STUDENT + STAFF routes (create request)', () => {
    const studentOrStaff: RoleEnum[] = ['STUDENT', 'STAFF'];

    it('allows STUDENT', () => {
      expect(resolveRoleGuard(studentOrStaff, 'STUDENT')).toBe('allow');
    });

    it('allows STAFF', () => {
      expect(resolveRoleGuard(studentOrStaff, 'STAFF')).toBe('allow');
    });

    it('redirects ADMIN to /app', () => {
      expect(resolveRoleGuard(studentOrStaff, 'ADMIN')).toBe('redirect-app');
    });
  });
});
