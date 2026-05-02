import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';

import { isRoleEnum } from '@core/http/auth-validation';
import type { RoleEnum } from './models/auth-api.types';
import { AuthSessionStore } from './auth-session.store';

/**
 * Validates `route.data['roles']` shape before granting access.
 *
 * Behavior by shape:
 *   - `undefined` → allow (neutral; useful for routes guarded only by `authGuard`).
 *   - `[]` → allow (empty list = no role restriction).
 *   - Valid `RoleEnum[]` → check user role; allow if match, redirect to `/app` if not.
 *   - Invalid shape (non-array, array with unknown role, `null` element) → fail closed → redirect to `/app`.
 *
 * User not authenticated → redirect to `/auth/login`.
 */

function parseAllowedRoles(raw: unknown): RoleEnum[] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) return null;
  if (!raw.every(isRoleEnum)) return null;
  return raw;
}

export const roleGuard: CanActivateFn = (route) => {
  const store = inject(AuthSessionStore);
  const router = inject(Router);

  const rawAllowed: unknown = route.data['roles'];
  const allowed = parseAllowedRoles(rawAllowed);

  if (allowed === null) {
    // Misconfigured route data — fail closed.
    return router.createUrlTree(['/app']);
  }

  if (allowed.length === 0) {
    return true;
  }

  const role = store.role();
  if (role === null) {
    return router.createUrlTree(['/auth/login']);
  }

  if (!allowed.includes(role)) {
    return router.createUrlTree(['/app']);
  }

  return true;
};
