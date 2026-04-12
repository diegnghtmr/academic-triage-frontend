import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthSessionStore } from '@core/auth/auth-session.store';
import { API_BASE_URL } from '@core/http/api-base-url.token';

/**
 * Adjunta `Authorization: Bearer` cuando exista token y la petición apunte al API oficial.
 * URLs absolutas a otros orígenes no reciben el encabezado.
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
