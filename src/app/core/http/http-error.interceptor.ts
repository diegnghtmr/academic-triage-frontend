import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthSessionStore } from '@core/auth/auth-session.store';
import { parseSafeReturnUrl } from '@core/http/return-url';

/**
 * Global 401 handler.
 *
 * On any 401 response:
 *   - Clears the `AuthSessionStore` (removes JWT + user from signals and localStorage).
 *   - Navigates to `/auth/login?returnUrl=<safe-current-path>`.
 *
 * Exception: if the failing request URL itself ends with `/auth/login`, the
 * error is propagated untouched. This prevents redirect loops on bad credentials
 * (the login page handles its own 401 via its own `catchError`).
 *
 * Future exemption note: if a refresh-token endpoint is introduced and it can
 * legitimately 401, add its suffix to the exemption check here.
 *
 * MUST be registered LAST in `withInterceptors([..., httpErrorInterceptor])`.
 * Ordering rationale:
 *   1. `apiBaseUrlInterceptor` — rewrites relative paths to absolute API URL.
 *   2. `authInterceptor` — attaches Bearer token to the fully-rewritten request.
 *   3. `httpErrorInterceptor` — observes the response of the prepared request.
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(AuthSessionStore);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        if (!req.url.endsWith('/auth/login')) {
          session.clearSession();
          const here = router.url;
          const safe = parseSafeReturnUrl(here);
          void router.navigateByUrl(
            `/auth/login?returnUrl=${encodeURIComponent(safe)}`,
          );
        }
      }
      return throwError(() => err);
    }),
  );
};
