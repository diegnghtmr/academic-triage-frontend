import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthSessionStore } from '@core/auth/auth-session.store';
import { API_BASE_URL } from '@core/http/api-base-url.token';

/**
 * Attaches `Authorization: Bearer` when a token exists and the request targets the official API.
 * Absolute URLs pointing to other origins do not receive the header.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(AuthSessionStore);
  const apiBase = inject(API_BASE_URL).replace(/\/$/, '');
  const token = session.token();
  if (token === null || token === '') {
    return next(req);
  }

  const url = req.url;
  if (/^https?:\/\//i.test(url) && !url.startsWith(apiBase)) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
