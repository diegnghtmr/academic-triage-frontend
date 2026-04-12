import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, EMPTY, finalize, forkJoin } from 'rxjs';

import { AuthSessionStore } from '@core/auth/auth-session.store';
import { ProblemErrorMapper } from '@core/http/problem-error.mapper';
import { ErrorAlert } from '@shared/components/error-alert';
import { LoadingState } from '@shared/components/loading-state';
import { adaptDashboardMetrics } from '@features/reports/adapters/dashboard-metrics.adapter';
import { ReportsApiService } from '@features/reports/data-access/reports-api.service';
import type { DashboardMetricsView } from '@features/reports/models/dashboard-metrics.types';
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
  imports: [RouterLink, DecimalPipe, ErrorAlert, LoadingState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h2>Dashboard — {{ roleLabel() }}</h2>

      @if (loading()) {
        <at-loading-state message="Cargando datos operativos…" />
      } @else {
        <at-error-alert [message]="error()" />

        @switch (role()) {
          @case ('STUDENT') {
            @let s = requestsSummary();
            <p>
              Bienvenido/a, <strong>{{ userName() }}</strong>.
              Tenés <strong>{{ s?.total ?? 0 }}</strong>
              {{ (s?.total ?? 0) === 1 ? 'solicitud registrada' : 'solicitudes registradas' }}.
            </p>

            <nav aria-label="Acciones rápidas">
              <a routerLink="/app/requests/new">Nueva solicitud</a>
              <span aria-hidden="true"> | </span>
              <a routerLink="/app/requests/list">Ver todas mis solicitudes</a>
            </nav>

            @if (s && s.recent.length > 0) {
              <section aria-labelledby="recent-heading">
                <h3 id="recent-heading">Solicitudes recientes</h3>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">ID</th>
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
                        <td>{{ r.status ?? '—' }}</td>
                        <td>{{ r.registrationDateTime ?? '—' }}</td>
                        <td>
                          @if (r.id !== undefined) {
                            <a
                              [routerLink]="['/app/requests', r.id]"
                              [attr.aria-label]="'Ver solicitud #' + r.id"
                            >Ver</a>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </section>
            } @else if (s && s.recent.length === 0 && s.total === 0) {
              <p>Aún no tenés solicitudes. Podés crear una nueva solicitud desde el enlace de arriba.</p>
            }
          }

          @case ('STAFF') {
            @let s = requestsSummary();
            <p>
              Bienvenido/a, <strong>{{ userName() }}</strong>.
              Hay <strong>{{ s?.total ?? 0 }}</strong>
              {{ (s?.total ?? 0) === 1 ? 'solicitud en el sistema' : 'solicitudes en el sistema' }}.
            </p>

            <nav aria-label="Acciones rápidas">
              <a routerLink="/app/requests/list">Ver solicitudes</a>
              <span aria-hidden="true"> | </span>
              <a routerLink="/app/business-rules">Reglas de negocio</a>
            </nav>

            @if (s && s.recent.length > 0) {
              <section aria-labelledby="staff-recent-heading">
                <h3 id="staff-recent-heading">Solicitudes recientes</h3>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">ID</th>
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
                        <td>{{ r.status ?? '—' }}</td>
                        <td>{{ r.priority ?? '—' }}</td>
                        <td>{{ r.registrationDateTime ?? '—' }}</td>
                        <td>
                          @if (r.id !== undefined) {
                            <a
                              [routerLink]="['/app/requests', r.id]"
                              [attr.aria-label]="'Ver solicitud #' + r.id"
                            >Ver</a>
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

            <nav aria-label="Acciones de administración">
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
              <section aria-labelledby="admin-overview-heading">
                <h3 id="admin-overview-heading">Resumen operativo</h3>
                <dl>
                  <dt>Total de solicitudes</dt>
                  <dd>{{ m.totalRequests }}</dd>
                  @if (m.averageResolutionTimeHours !== null) {
                    <dt>Tiempo promedio de resolución</dt>
                    <dd>{{ m.averageResolutionTimeHours | number: '1.1-1' }} horas</dd>
                  }
                </dl>
              </section>

              @if (m.byStatus.length > 0) {
                <section aria-labelledby="admin-status-heading">
                  <h3 id="admin-status-heading">Por estado</h3>
                  <table aria-labelledby="admin-status-heading">
                    <thead>
                      <tr>
                        <th scope="col">Estado</th>
                        <th scope="col">Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (entry of m.byStatus; track entry.key) {
                        <tr>
                          <td>{{ entry.key }}</td>
                          <td>{{ entry.value }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </section>
              }

              @if (m.topResponsibles.length > 0) {
                <section aria-labelledby="admin-top-heading">
                  <h3 id="admin-top-heading">Top responsables</h3>
                  <table aria-labelledby="admin-top-heading">
                    <thead>
                      <tr>
                        <th scope="col">Responsable</th>
                        <th scope="col">Resueltas</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (entry of m.topResponsibles; track entry.user?.id) {
                        <tr>
                          <td>
                            {{ entry.user?.firstName }} {{ entry.user?.lastName }}
                            @if (entry.user?.username) {
                              <small>({{ entry.user?.username }})</small>
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
              <p>No hay datos de reportes disponibles.</p>
            }

            @if (s && s.recent.length > 0) {
              <section aria-labelledby="admin-recent-heading">
                <h3 id="admin-recent-heading">Solicitudes recientes (últimas {{ s.recent.length }})</h3>
                <table aria-labelledby="admin-recent-heading">
                  <thead>
                    <tr>
                      <th scope="col">ID</th>
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
                        <td>{{ r.status ?? '—' }}</td>
                        <td>{{ r.priority ?? '—' }}</td>
                        <td>{{ r.registrationDateTime ?? '—' }}</td>
                        <td>
                          @if (r.id !== undefined) {
                            <a
                              [routerLink]="['/app/requests', r.id]"
                              [attr.aria-label]="'Ver solicitud #' + r.id"
                            >Ver</a>
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
            <p>Rol no reconocido. Cerrá sesión e ingresá nuevamente.</p>
          }
        }
      }
    </section>
  `,
})
export class Dashboard {
  private readonly session = inject(AuthSessionStore);
  private readonly requestsApi = inject(RequestsApiService);
  private readonly reportsApi = inject(ReportsApiService);
  private readonly problemMapper = inject(ProblemErrorMapper);

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
      case 'STUDENT': return 'Estudiante';
      case 'STAFF':   return 'Staff';
      case 'ADMIN':   return 'Administrador';
      default:        return '';
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
      )
      .subscribe((page) => {
        this.requestsSummary.set(adaptRequestsSummary(page));
      });
  }

  private loadAdminData(): void {
    forkJoin({
      metrics: this.reportsApi.getDashboard(),
      requests: this.requestsApi.listRequests({ page: 0, size: 5, sort: 'registrationDateTime,desc' }),
    })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          this.error.set(p?.detail ?? p?.title ?? 'No se pudieron cargar los datos del dashboard.');
          return EMPTY;
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe(({ metrics, requests }) => {
        this.adminMetrics.set(adaptDashboardMetrics(metrics));
        this.requestsSummary.set(adaptRequestsSummary(requests));
      });
  }
}
