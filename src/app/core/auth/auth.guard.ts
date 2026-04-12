import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthSessionStore } from './auth-session.store';

/**
 * Bloquea rutas si no hay sesión válida (token + usuario).
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const store = inject(AuthSessionStore);
  const router = inject(Router);
  if (!store.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url },
    });
  }
  return true;
};
