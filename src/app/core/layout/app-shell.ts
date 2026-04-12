import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

import { AuthSessionStore } from '@core/auth/auth-session.store';

/**
 * Shell de la zona autenticada: outlet para features lazy bajo `/app/**`.
 */
@Component({
  selector: 'at-app-shell',
  imports: [RouterOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header role="banner">
      <h1>Academic Triage</h1>
      <nav aria-label="Navegación principal">
        <a routerLink="/app/dashboard">Inicio</a>
        <span aria-hidden="true"> | </span>
        <a routerLink="/app/requests/list">Solicitudes</a>
        @if (canCreateRequest()) {
          <span aria-hidden="true"> | </span>
          <a routerLink="/app/requests/new">Nueva solicitud</a>
        }
        @if (isAdmin()) {
          <span aria-hidden="true"> | </span>
          <a routerLink="/app/reports">Reportes</a>
          <span aria-hidden="true"> | </span>
          <a routerLink="/app/users">Usuarios</a>
          <span aria-hidden="true"> | </span>
          <a routerLink="/app/catalogs/request-types">Tipos de solicitud</a>
          <span aria-hidden="true"> | </span>
          <a routerLink="/app/catalogs/origin-channels">Canales de origen</a>
        }
        @if (canViewBusinessRules()) {
          <span aria-hidden="true"> | </span>
          <a routerLink="/app/business-rules">Reglas de negocio</a>
        }
      </nav>
      <p>Sesión: {{ sessionLabel() }}</p>
      <button type="button" (click)="logout()">Cerrar sesión</button>
    </header>
    <main>
      <router-outlet />
    </main>
  `,
})
export class AppShell {
  private readonly session = inject(AuthSessionStore);
  private readonly router = inject(Router);

  protected readonly sessionLabel = computed(() => {
    const u = this.session.user();
    if (u?.username !== undefined && u.username !== '') {
      return `${u.username} (${u.role ?? '—'})`;
    }
    return 'autenticado';
  });

  /** Crear solicitud: solo STUDENT / STAFF. */
  protected readonly canCreateRequest = computed(() => {
    const r = this.session.role();
    return r === 'STUDENT' || r === 'STAFF';
  });

  /** Acceso a administración de catálogos: solo ADMIN. */
  protected readonly isAdmin = computed(() => this.session.role() === 'ADMIN');

  /** Ver reglas de negocio: ADMIN y STAFF (contrato + PRD). */
  protected readonly canViewBusinessRules = computed(() => {
    const r = this.session.role();
    return r === 'ADMIN' || r === 'STAFF';
  });

  protected logout(): void {
    this.session.clearSession();
    void this.router.navigate(['/auth/login']);
  }
}
