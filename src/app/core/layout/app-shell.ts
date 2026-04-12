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
      <nav>
        <a routerLink="/app/dashboard">Inicio</a>
        |
        <a routerLink="/app/requests/list">Solicitudes</a>
        @if (canCreateRequest()) {
          |
          <a routerLink="/app/requests/new">Nueva solicitud</a>
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

  /** Matriz UI (PRD): crear solicitud solo STUDENT / STAFF, no ADMIN. */
  protected readonly canCreateRequest = computed(() => {
    const r = this.session.role();
    return r === 'STUDENT' || r === 'STAFF';
  });

  protected logout(): void {
    this.session.clearSession();
    void this.router.navigate(['/auth/login']);
  }
}
