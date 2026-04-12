import { Injectable } from '@angular/core';

/**
 * Punto de extensión para reacciones globales a 401/403 (p. ej. limpiar sesión y navegar).
 * Fase 3: sin implementación para no acoplar redirecciones globales ni duplicar la política de guards.
 */
@Injectable({ providedIn: 'root' })
export class HttpAuthPolicy {
  onUnauthorized(): void {}

  onForbidden(): void {}
}
