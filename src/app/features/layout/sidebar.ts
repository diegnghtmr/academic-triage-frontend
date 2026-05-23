import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  inject,
  input,
  output,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PxIcon } from '@shared/ui/px-icon';

@Component({
  selector: 'at-sidebar',
  imports: [RouterLink, RouterLinkActive, PxIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      grid-row: 1 / 3;
      background: var(--at-surface);
      border-right: 1px solid var(--at-border-hi);
      width: 240px;
      overflow: hidden;
    }

    :host.ready {
      transition: width var(--at-dur) var(--at-ease);
    }

    :host.collapsed {
      width: 64px;
    }

    .sidebar__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 48px;
      padding: 0 var(--at-s4);
      border-bottom: 1px solid var(--at-border);
      flex-shrink: 0;
    }

    .sidebar__brand {
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-sm);
      font-weight: 800;
      letter-spacing: var(--at-tracking-wide);
      color: var(--at-mercury);
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
    }

    .sidebar__toggle {
      background: transparent;
      border: 1px solid var(--at-border-hi);
      border-radius: var(--at-radius);
      color: var(--at-text-muted);
      padding: var(--at-s1);
      cursor: pointer;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition:
        border-color var(--at-dur-fast) var(--at-ease),
        color var(--at-dur-fast) var(--at-ease);

      &:hover {
        border-color: var(--at-mercury);
        color: var(--at-mercury);
      }
    }

    nav {
      display: flex;
      flex-direction: column;
      flex: 1;
      padding: var(--at-s3) 0;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: var(--at-s3);
      padding: var(--at-s2) var(--at-s4);
      color: var(--at-text-muted);
      font-family: var(--at-font-sans);
      font-size: var(--at-fs-sm);
      text-decoration: none;
      white-space: nowrap;
      overflow: hidden;
      transition:
        color var(--at-dur-fast) var(--at-ease),
        background var(--at-dur-fast) var(--at-ease);

      &:hover {
        color: var(--at-text);
        background: var(--at-surface-2);
      }
    }

    .nav-item.active {
      color: var(--at-text);
      background: var(--at-surface-2);
      border-left: 2px solid var(--at-mercury);
    }

    .nav-item__label {
      overflow: hidden;
      text-overflow: ellipsis;
    }
    :host.ready .nav-item__label {
      transition:
        opacity var(--at-dur-fast) var(--at-ease),
        max-width var(--at-dur) var(--at-ease);
    }

    :host.collapsed .nav-item__label {
      opacity: 0;
      max-width: 0;
    }

    .sidebar__footer {
      border-top: 1px solid var(--at-border);
      padding: var(--at-s3) var(--at-s4);
      flex-shrink: 0;
    }

    .sidebar__session {
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      color: var(--at-text-dim);
      margin-bottom: var(--at-s2);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: opacity var(--at-dur-fast) var(--at-ease);
    }

    :host.collapsed .sidebar__session {
      opacity: 0;
    }

    .btn--logout {
      display: flex;
      align-items: center;
      gap: var(--at-s2);
      width: 100%;
      background: transparent;
      border: 1px solid var(--at-border-hi);
      border-radius: var(--at-radius);
      color: var(--at-text-muted);
      font-family: var(--at-font-sans);
      font-size: var(--at-fs-xs);
      padding: var(--at-s1) var(--at-s3);
      cursor: pointer;
      transition:
        border-color var(--at-dur-fast) var(--at-ease),
        color var(--at-dur-fast) var(--at-ease);
      white-space: nowrap;
      overflow: hidden;

      &:hover {
        border-color: var(--at-danger);
        color: var(--at-danger);
      }
    }

    .btn__label {
      overflow: hidden;
      text-overflow: ellipsis;
    }
    :host.ready .btn__label {
      transition:
        opacity var(--at-dur-fast) var(--at-ease),
        max-width var(--at-dur) var(--at-ease);
    }

    :host.collapsed .btn__label {
      opacity: 0;
      max-width: 0;
    }

    @media (max-width: 768px) {
      :host {
        position: fixed;
        top: 0;
        left: 0;
        height: 100dvh;
        z-index: 100;
      }

      :host.collapsed {
        transform: translateX(-100%);
        width: 240px;
      }
    }
  `,
  template: `
    <div class="sidebar__head">
      @if (!collapsed()) {
        <span class="sidebar__brand">AT</span>
      }
      <button
        type="button"
        class="sidebar__toggle"
        [attr.aria-label]="collapsed() ? 'Expandir menú' : 'Contraer menú'"
        [attr.aria-expanded]="!collapsed()"
        (click)="sidebarToggle.emit()"
      >
        <at-px-icon [name]="collapsed() ? 'list' : 'close'" [size]="16" />
      </button>
    </div>

    <nav aria-label="Navegación principal">
      <a
        class="nav-item"
        routerLink="/app/dashboard"
        routerLinkActive="active"
        [attr.aria-label]="'Inicio'"
      >
        <at-px-icon name="dashboard" [size]="16" />
        <span class="nav-item__label">Inicio</span>
      </a>

      <a
        class="nav-item"
        routerLink="/app/requests/list"
        routerLinkActive="active"
        [attr.aria-label]="'Solicitudes'"
      >
        <at-px-icon name="list" [size]="16" />
        <span class="nav-item__label">Solicitudes</span>
      </a>

      @if (canCreateRequest()) {
        <a
          class="nav-item"
          routerLink="/app/requests/new"
          routerLinkActive="active"
          [attr.aria-label]="'Nueva solicitud'"
        >
          <at-px-icon name="plus" [size]="16" />
          <span class="nav-item__label">Nueva solicitud</span>
        </a>
      }

      @if (isAdmin()) {
        <a
          class="nav-item"
          routerLink="/app/reports"
          routerLinkActive="active"
          [attr.aria-label]="'Reportes'"
        >
          <at-px-icon name="chart" [size]="16" />
          <span class="nav-item__label">Reportes</span>
        </a>

        <a
          class="nav-item"
          routerLink="/app/users"
          routerLinkActive="active"
          [attr.aria-label]="'Usuarios'"
        >
          <at-px-icon name="users" [size]="16" />
          <span class="nav-item__label">Usuarios</span>
        </a>

        <a
          class="nav-item"
          routerLink="/app/catalogs/request-types"
          routerLinkActive="active"
          [attr.aria-label]="'Tipos de solicitud'"
        >
          <at-px-icon name="tag" [size]="16" />
          <span class="nav-item__label">Tipos de solicitud</span>
        </a>

        <a
          class="nav-item"
          routerLink="/app/catalogs/origin-channels"
          routerLinkActive="active"
          [attr.aria-label]="'Canales de origen'"
        >
          <at-px-icon name="channel" [size]="16" />
          <span class="nav-item__label">Canales de origen</span>
        </a>
      }

      @if (canViewBusinessRules()) {
        <a
          class="nav-item"
          routerLink="/app/business-rules"
          routerLinkActive="active"
          [attr.aria-label]="'Reglas de negocio'"
        >
          <at-px-icon name="rules" [size]="16" />
          <span class="nav-item__label">Reglas de negocio</span>
        </a>
      }
    </nav>

    <div class="sidebar__footer">
      <p class="sidebar__session">{{ sessionLabel() }}</p>
      <button type="button" class="btn--logout" (click)="logoutRequest.emit()">
        <span class="btn__label">Cerrar sesión</span>
      </button>
    </div>
  `,
})
export class Sidebar {
  @HostBinding('class.collapsed')
  get isCollapsed(): boolean {
    return this.collapsed();
  }

  readonly collapsed = input.required<boolean>();
  readonly sessionLabel = input.required<string>();
  readonly canCreateRequest = input.required<boolean>();
  readonly isAdmin = input.required<boolean>();
  readonly canViewBusinessRules = input.required<boolean>();

  readonly sidebarToggle = output<void>();
  readonly logoutRequest = output<void>();

  private readonly hostRef = inject(ElementRef<HTMLElement>);

  constructor() {
    afterNextRender(() => {
      this.hostRef.nativeElement.classList.add('ready');
    });
  }
}
