import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { AuthSessionStore } from '@core/auth/auth-session.store';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

/**
 * Shell de la zona autenticada: outlet para features lazy bajo `/app/**`.
 */
@Component({
  selector: 'at-app-shell',
  imports: [RouterOutlet, Sidebar, Topbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
    }

    .app {
      display: grid;
      grid-template-columns: 240px 1fr;
      grid-template-rows: 48px 1fr;
      height: 100dvh;
    }

    .app.collapsed {
      grid-template-columns: 64px 1fr;
    }

    .app__main {
      grid-column: 2;
      grid-row: 2;
      padding: var(--at-s6) var(--at-s8);
      overflow-y: auto;
      min-height: 0;
      view-transition-name: app-main;
    }
  `,
  template: `
    <div class="app" [class.collapsed]="collapsed()">
      <at-sidebar
        [collapsed]="collapsed()"
        [sessionLabel]="sessionLabel()"
        [canCreateRequest]="canCreateRequest()"
        [isAdmin]="isAdmin()"
        [canViewBusinessRules]="canViewBusinessRules()"
        (sidebarToggle)="collapsed.set(!collapsed())"
        (logoutRequest)="logout()"
      />
      <at-topbar
        [sessionLabel]="sessionLabel()"
        (logoutRequest)="logout()"
      />
      <main class="app__main">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppShell {
  private readonly session = inject(AuthSessionStore);
  private readonly router = inject(Router);

  protected readonly collapsed = signal<boolean>(false);

  protected readonly sessionLabel = computed(() => {
    const u = this.session.user();
    const firstName = u?.firstName?.trim() ?? '';
    const lastName = u?.lastName?.trim() ?? '';
    const fullName = `${firstName} ${lastName}`.trim();
    const email = u?.email?.trim() ?? '';

    if (fullName !== '' && email !== '') {
      return `${fullName} · ${email}`;
    }
    if (fullName !== '') {
      return fullName;
    }
    if (email !== '') {
      return email;
    }
    if (u?.username !== undefined && u.username !== '') {
      return u.username;
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
