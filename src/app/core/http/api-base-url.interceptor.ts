import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { API_BASE_URL } from './api-base-url.token';

/**
 * Antepone {@link API_BASE_URL} a URLs relativas del cliente HTTP.
 * Rutas absolutas (`http(s)://`) no se modifican.
 */
export const apiBaseUrlInterceptor: HttpInterceptorFn = (req, next) => {
  const base = inject(API_BASE_URL);
  if (/^https?:\/\//i.test(req.url)) {
    return next(req);
  }
  const path = req.url.replace(/^\//, '');
  const prefix = base.replace(/\/$/, '');
  const url = `${prefix}/${path}`;
  return next(req.clone({ url }));
};
