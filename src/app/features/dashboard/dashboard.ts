import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthSessionStore } from '@core/auth/auth-session.store';

@Component({
  selector: 'at-dashboard',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h2>Dashboard</h2>
      <p>{{ note() }}</p>
      <nav>
        <a routerLink="/app/requests/list">Ver solicitudes</a>
        @if (canCreateRequest()) {
          |
          <a routerLink="/app/requests/new">Nueva solicitud</a>
        }
      </nav>
    </section>
  `,
})
export class Dashboard {
  private readonly session = inject(AuthSessionStore);

  protected readonly note = signal(
    'Resumen operativo y métricas — fases posteriores (sin reportes en esta entrega).',
  );

  protected readonly canCreateRequest = computed(() => {
    const r = this.session.role();
    return r === 'STUDENT' || r === 'STAFF';
  });
}
