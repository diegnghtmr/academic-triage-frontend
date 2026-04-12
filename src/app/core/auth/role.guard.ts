import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import type { RoleEnum } from './models/auth-api.types';
import { AuthSessionStore } from './auth-session.store';

/**
 * Comprueba `route.data['roles']` contra el rol del usuario autenticado.
 * Sin lista en `data`: deja pasar (comportamiento neutro para rutas solo con `authGuard`).
 */
export const roleGuard: CanActivateFn = (route) => {
  const store = inject(AuthSessionStore);
  const router = inject(Router);
  const allowed = route.data['roles'] as RoleEnum[] | undefined;
  if (allowed === undefined || allowed.length === 0) {
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
