import { HttpInterceptorFn } from '@angular/common/http';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Inyecta un `Idempotency-Key` único por request mutante.
 * El backend lo exige para POST/PUT/PATCH/DELETE; sin él responde 400.
 * Si el caller ya provee el header (retry manual con misma key), se respeta.
 */
export const idempotencyKeyInterceptor: HttpInterceptorFn = (req, next) => {
  if (!MUTATING_METHODS.has(req.method.toUpperCase())) {
    return next(req);
  }
  if (req.headers.has('Idempotency-Key')) {
    return next(req);
  }
  const key = generateIdempotencyKey();
  return next(req.clone({ setHeaders: { 'Idempotency-Key': key } }));
};

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
