import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, EMPTY, finalize, forkJoin } from 'rxjs';

import { AuthSessionStore } from '@core/auth/auth-session.store';
import { ProblemErrorMapper } from '@core/http/problem-error.mapper';
import { ErrorAlert } from '@shared/components/error-alert';
import { LoadingState } from '@shared/components/loading-state';
import { KpiCard } from '@shared/components/kpi-card';
import { StateBadge } from '@shared/components/state-badge';
import { PriorityBadge } from '@shared/components/priority-badge';
import { DateTimeLabelPipe } from '@shared/pipes/date-time-label.pipe';
import { DisplayLabelPipe } from '@shared/pipes/display-label.pipe';
import { DurationHoursLabelPipe } from '@shared/pipes/duration-hours-label.pipe';
import { UsernameLabelPipe } from '@shared/pipes/username-label.pipe';
import { adaptDashboardMetrics } from '@shared/data-access/dashboard-metrics.adapter';
import { ReportsApiService } from '@shared/data-access/reports-api.service';
import type { DashboardMetricsView } from '@shared/data-access/dashboard-metrics.types';
import { RequestsApiService } from '@features/requests/data-access/requests-api.service';

import { adaptRequestsSummary } from './adapters/dashboard-requests.adapter';
import type { RequestsSummaryView } from './models/dashboard-view';

/**
 * Dashboard operativo diferenciado por rol.
 *
 * | Rol     | Fuente de datos                        |
 * |---------|----------------------------------------|
 * | STUDENT | GET /requests (propias del backend)    |
 * | STAFF   | GET /requests (todas las visibles)     |
 * | ADMIN   | GET /reports/dashboard + GET /requests |
 */
@Component({
  selector: 'at-dashboard',
  imports: [
    RouterLink,
    ErrorAlert,
    LoadingState,
    KpiCard,
    StateBadge,
    PriorityBadge,
    DisplayLabelPipe,
    DateTimeLabelPipe,
    DurationHoursLabelPipe,
    UsernameLabelPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section">
      <h2 class="section__title">Dashboard — {{ roleLabel() }}</h2>

      @if (loading()) {
        <at-loading-state message="Cargando datos operativos…" />
      } @else {
        <at-error-alert [message]="error()" />

        @switch (role()) {
          @case ('STUDENT') {
            @let s = requestsSummary();
            <div class="kpi-row">
              <at-kpi-card label="Solicitudes totales" [value]="s?.total ?? 0" />
            </div>

            <p class="dash-greeting">
              Hola, <strong>{{ userName() }}</strong>.
              Tienes <strong>{{ s?.total ?? 0 }}</strong>
              {{ (s?.total ?? 0) === 1 ? 'solicitud registrada' : 'solicitudes registradas' }}.
            </p>

            <nav class="dash-nav" aria-label="Acciones rápidas">
              <a routerLink="/app/requests/new">Nueva solicitud</a>
              <span aria-hidden="true"> | </span>
              <a routerLink="/app/requests/list">Ver todas mis solicitudes</a>
            </nav>

            @if (s && s.recent.length > 0) {
              <section aria-labelledby="recent-heading">
                <h3 id="recent-heading" class="section__subtitle">Solicitudes recientes</h3>
                <table class="tbl">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Tipo</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Registro</th>
                      <th scope="col">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (r of s.recent; track r.id) {
                      <tr>
                        <td>{{ r.id }}</td>
                        <td>{{ r.requestType?.name ?? '—' }}</td>
                        <td>
                          @if (r.status) {
                            <at-state-badge [state]="r.status" />
                          } @else {
                            <span>—</span>
                          }
                        </td>
                        <td>{{ r.registrationDateTime | dateTimeLabel }}</td>
                        <td>
                          @if (r.id !== undefined) {
                            <a
                              [routerLink]="['/app/requests', r.id]"
                              [attr.aria-label]="'Ver solicitud número ' + r.id"
                              >Ver</a
                            >
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </section>
            } @else if (s && s.recent.length === 0 && s.total === 0) {
              <p class="dash-empty">
                Aún no tienes solicitudes. Puedes crear una nueva solicitud desde el enlace de
                arriba.
              </p>
            }
          }

          @case ('STAFF') {
            @let s = requestsSummary();
            <div class="kpi-row">
              <at-kpi-card label="Solicitudes en el sistema" [value]="s?.total ?? 0" />
            </div>

            <p class="dash-greeting">
              Hola, <strong>{{ userName() }}</strong>.
              Hay <strong>{{ s?.total ?? 0 }}</strong>
              {{ (s?.total ?? 0) === 1 ? 'solicitud en el sistema' : 'solicitudes en el sistema' }}.
            </p>

            <nav class="dash-nav" aria-label="Acciones rápidas">
              <a routerLink="/app/requests/list">Ver solicitudes</a>
              <span aria-hidden="true"> | </span>
              <a routerLink="/app/business-rules">Reglas de negocio</a>
            </nav>

            @if (s && s.recent.length > 0) {
              <section aria-labelledby="staff-recent-heading">
                <h3 id="staff-recent-heading" class="section__subtitle">Solicitudes recientes</h3>
                <table class="tbl">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Tipo</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Prioridad</th>
                      <th scope="col">Registro</th>
                      <th scope="col">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (r of s.recent; track r.id) {
                      <tr>
                        <td>{{ r.id }}</td>
                        <td>{{ r.requestType?.name ?? '—' }}</td>
                        <td>
                          @if (r.status) {
                            <at-state-badge [state]="r.status" />
                          } @else {
                            <span>—</span>
                          }
                        </td>
                        <td>
                          @if (r.priority) {
                            <at-priority-badge [priority]="r.priority" />
                          } @else {
                            <span>—</span>
                          }
                        </td>
                        <td>{{ r.registrationDateTime | dateTimeLabel }}</td>
                        <td>
                          @if (r.id !== undefined) {
                            <a
                              [routerLink]="['/app/requests', r.id]"
                              [attr.aria-label]="'Ver solicitud número ' + r.id"
                              >Ver</a
                            >
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </section>
            }
          }

          @case ('ADMIN') {
            @let m = adminMetrics();
            @let s = requestsSummary();

            <nav class="dash-nav" aria-label="Acciones de administración">
              <a routerLink="/app/reports">Ver reportes completos</a>
              <span aria-hidden="true"> | </span>
              <a routerLink="/app/requests/list">Solicitudes</a>
              <span aria-hidden="true"> | </span>
              <a routerLink="/app/users">Usuarios</a>
              <span aria-hidden="true"> | </span>
              <a routerLink="/app/catalogs/request-types">Tipos</a>
              <span aria-hidden="true"> | </span>
              <a routerLink="/app/catalogs/origin-channels">Canales</a>
              <span aria-hidden="true"> | </span>
              <a routerLink="/app/business-rules">Reglas de negocio</a>
            </nav>

            @if (m) {
              <div class="kpi-row">
                <at-kpi-card label="Total de solicitudes" [value]="m.totalRequests" />
                @if (m.averageResolutionTimeHours !== null) {
                  <at-kpi-card
                    label="Tiempo promedio de resolución"
                    [value]="m.averageResolutionTimeHours | durationHoursLabel"
                  />
                }
              </div>

              @if (m.byStatus.length > 0) {
                <section aria-labelledby="admin-status-heading">
                  <h3 id="admin-status-heading" class="section__subtitle">Por estado</h3>
                  <table class="tbl" aria-labelledby="admin-status-heading">
                    <thead>
                      <tr>
                        <th scope="col">Estado</th>
                        <th scope="col">Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (entry of m.byStatus; track entry.key) {
                        <tr>
                          <td>{{ entry.key | displayLabel: 'requestStatus' }}</td>
                          <td>{{ entry.value }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </section>
              }

              @if (m.topResponsibles.length > 0) {
                <section aria-labelledby="admin-top-heading">
                  <h3 id="admin-top-heading" class="section__subtitle">Top responsables</h3>
                  <table class="tbl" aria-labelledby="admin-top-heading">
                    <thead>
                      <tr>
                        <th scope="col">Responsable</th>
                        <th scope="col">Resueltas</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (entry of m.topResponsibles; track entry.user?.id ?? $index) {
                        <tr>
                          <td>
                            {{ entry.user?.firstName }} {{ entry.user?.lastName }}
                            @if (entry.user?.username) {
                              <small>({{ entry.user?.username | usernameLabel }})</small>
                            }
                          </td>
                          <td>{{ entry.resolvedCount ?? 0 }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </section>
              }
            } @else if (!loading() && !error()) {
              <p class="dash-empty">Todavía no hay información disponible para mostrar en este resumen.</p>
            }

            @if (s && s.recent.length > 0) {
              <section aria-labelledby="admin-recent-heading">
                <h3 id="admin-recent-heading" class="section__subtitle">
                  Solicitudes recientes (últimas {{ s.recent.length }})
                </h3>
                <table class="tbl" aria-labelledby="admin-recent-heading">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Tipo</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Prioridad</th>
                      <th scope="col">Registro</th>
                      <th scope="col">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (r of s.recent; track r.id) {
                      <tr>
                        <td>{{ r.id }}</td>
                        <td>{{ r.requestType?.name ?? '—' }}</td>
                        <td>
                          @if (r.status) {
                            <at-state-badge [state]="r.status" />
                          } @else {
                            <span>—</span>
                          }
                        </td>
                        <td>
                          @if (r.priority) {
                            <at-priority-badge [priority]="r.priority" />
                          } @else {
                            <span>—</span>
                          }
                        </td>
                        <td>{{ r.registrationDateTime | dateTimeLabel }}</td>
                        <td>
                          @if (r.id !== undefined) {
                            <a
                              [routerLink]="['/app/requests', r.id]"
                              [attr.aria-label]="'Ver solicitud número ' + r.id"
                              >Ver</a
                            >
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </section>
            }
          }

          @default {
            <p>Rol no reconocido. Cierra sesión e inicia nuevamente.</p>
          }
        }
      }
    </section>
  `,
  styles: `
    .section { padding: var(--at-s6); }
    .section__title {
      font-size: var(--at-fs-xl);
      font-weight: 800;
      letter-spacing: var(--at-tracking-tight);
      margin-bottom: var(--at-s4);
    }
    .section__subtitle {
      font-size: var(--at-fs-base);
      font-weight: 800;
      margin: var(--at-s4) 0 var(--at-s2);
      color: var(--at-text-muted);
    }
    .kpi-row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--at-s3);
      margin-bottom: var(--at-s4);
    }
    .dash-greeting {
      margin-bottom: var(--at-s3);
      color: var(--at-text-muted);
    }
    .dash-nav {
      display: flex;
      flex-wrap: wrap;
      gap: var(--at-s2);
      margin-bottom: var(--at-s4);
      font-size: var(--at-fs-sm);
      font-family: var(--at-font-mono);
    }
    .dash-empty {
      color: var(--at-text-muted);
      font-style: italic;
    }
  `,
})
export class Dashboard {
  private readonly session = inject(AuthSessionStore);
  private readonly requestsApi = inject(RequestsApiService);
  private readonly reportsApi = inject(ReportsApiService);
  private readonly problemMapper = inject(ProblemErrorMapper);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly role = computed(() => this.session.role());

  protected readonly userName = computed(() => {
    const u = this.session.user();
    if (u?.firstName !== undefined && u.firstName !== '') {
      return u.firstName;
    }
    return u?.username ?? 'usuario';
  });

  protected readonly roleLabel = computed(() => {
    switch (this.role()) {
      case 'STUDENT':
        return 'Estudiante';
      case 'STAFF':
        return 'Staff';
      case 'ADMIN':
        return 'Administrador';
      default:
        return '';
    }
  });

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly requestsSummary = signal<RequestsSummaryView | null>(null);
  protected readonly adminMetrics = signal<DashboardMetricsView | null>(null);

  constructor() {
    this.loadForRole();
  }

  private loadForRole(): void {
    const role = this.role();

    if (role === 'STUDENT' || role === 'STAFF') {
      this.loadRequestsSummary();
      return;
    }

    if (role === 'ADMIN') {
      this.loadAdminData();
      return;
    }

    this.loading.set(false);
  }

  private loadRequestsSummary(): void {
    this.requestsApi
      .listRequests({ page: 0, size: 5, sort: 'registrationDateTime,desc' })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          this.error.set(p?.detail ?? p?.title ?? 'No se pudieron cargar las solicitudes.');
          return EMPTY;
        }),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => {
        this.requestsSummary.set(adaptRequestsSummary(page));
      });
  }

  private loadAdminData(): void {
    forkJoin({
      metrics: this.reportsApi.getDashboard(),
      requests: this.requestsApi.listRequests({
        page: 0,
        size: 5,
        sort: 'registrationDateTime,desc',
      }),
    })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          this.error.set(p?.detail ?? p?.title ?? 'No se pudieron cargar los datos del dashboard.');
          return EMPTY;
        }),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ metrics, requests }) => {
        this.adminMetrics.set(adaptDashboardMetrics(metrics));
        this.requestsSummary.set(adaptRequestsSummary(requests));
      });
  }
}
