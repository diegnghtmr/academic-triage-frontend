import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthSessionStore } from './auth-session.store';

/** Prevents showing login/register when a session already exists (redirects back to the shell). */
export const guestGuard: CanActivateFn = () => {
  const store = inject(AuthSessionStore);
  const router = inject(Router);
  if (store.isAuthenticated()) {
    return router.createUrlTree(['/app']);
  }
  return true;
};
