import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthSessionStore } from './auth-session.store';

/** Evita mostrar login/registro si ya hay sesión (vuelta al shell). */
export const guestGuard: CanActivateFn = () => {
  const store = inject(AuthSessionStore);
  const router = inject(Router);
  if (store.isAuthenticated()) {
    return router.createUrlTree(['/app']);
  }
  return true;
};
