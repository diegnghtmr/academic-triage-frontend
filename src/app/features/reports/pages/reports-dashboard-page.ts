import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { catchError, EMPTY, finalize, map } from 'rxjs';

import { ProblemErrorMapper } from '@core/http/problem-error.mapper';
import { ErrorAlert } from '@shared/ui/error-alert';
import { KpiCard } from '@shared/ui/kpi-card';
import { LoadingState } from '@shared/ui/loading-state';
import { PageSection } from '@shared/ui/page-section';
import { DisplayLabelPipe } from '@shared/pipes/display-label.pipe';
import { DurationHoursLabelPipe } from '@shared/pipes/duration-hours-label.pipe';
import { UsernameLabelPipe } from '@shared/pipes/username-label.pipe';

import { adaptDashboardMetrics } from '@shared/data-access/dashboard-metrics.adapter';
import { ReportsApiService } from '@shared/data-access/reports-api.service';
import type { DashboardMetricsView } from '@shared/data-access/dashboard-metrics.types';

@Component({
  selector: 'at-reports-dashboard-page',
  imports: [
    ReactiveFormsModule,
    PageSection,
    LoadingState,
    ErrorAlert,
    KpiCard,
    DisplayLabelPipe,
    DurationHoursLabelPipe,
    UsernameLabelPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <at-page-section title="Reportes — Dashboard operativo">
      <div class="filter-bar" [class.is-active]="hasActiveFilter()">
        <form class="filter-bar__form" [formGroup]="filterForm" (ngSubmit)="load()">
          <div class="filter-bar__group">
            <label class="filter-bar__field">
              <span>Desde</span>
              <input class="input filter-bar__input" type="date" formControlName="dateFrom" />
            </label>
            <label class="filter-bar__field">
              <span>Hasta</span>
              <input class="input filter-bar__input" type="date" formControlName="dateTo" />
            </label>
          </div>
          <div class="filter-bar__actions">
            <button class="btn filter-bar__btn" type="submit" [disabled]="loading()">
              Aplicar
            </button>
            <button
              class="btn btn--ghost filter-bar__btn"
              type="button"
              (click)="clearFilter()"
              [disabled]="loading() || !hasActiveFilter()"
            >
              Sin filtro
            </button>
          </div>
        </form>
        @if (hasActiveFilter()) {
          <p class="filter-bar__chip" aria-live="polite">
            <span class="filter-bar__chip-dot" aria-hidden="true"></span>
            Filtro activo · {{ activeFilterLabel() }}
          </p>
        }
      </div>

      <at-error-alert [message]="errorMessage()" />

      @if (loading() && !metrics()) {
        <at-loading-state message="Cargando métricas…" />
      } @else if (metrics()) {
        @let m = metrics()!;

        <div class="stale-wrap" [class.is-stale]="loading()" [attr.aria-busy]="loading()">

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
          <article class="report-article">
            <h3 id="report-by-status" class="report-article__title">Por estado</h3>
            <table class="tbl" aria-labelledby="report-by-status">
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
          </article>
        }

        @if (m.byType.length > 0) {
          <article class="report-article">
            <h3 id="report-by-type" class="report-article__title">Por tipo</h3>
            <table class="tbl" aria-labelledby="report-by-type">
              <thead>
                <tr>
                  <th scope="col">Tipo</th>
                  <th scope="col">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of m.byType; track entry.key) {
                  <tr>
                    <td>{{ entry.key }}</td>
                    <td>{{ entry.value }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </article>
        }

        @if (m.byPriority.length > 0) {
          <article class="report-article">
            <h3 id="report-by-priority" class="report-article__title">Por prioridad</h3>
            <table class="tbl" aria-labelledby="report-by-priority">
              <thead>
                <tr>
                  <th scope="col">Prioridad</th>
                  <th scope="col">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of m.byPriority; track entry.key) {
                  <tr>
                    <td>{{ entry.key | displayLabel: 'priority' }}</td>
                    <td>{{ entry.value }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </article>
        }

        @if (m.topResponsibles.length > 0) {
          <article class="report-article">
            <h3 id="report-top-responsibles" class="report-article__title">Top responsables</h3>
            <table class="tbl" aria-labelledby="report-top-responsibles">
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
          </article>
        }
        </div>
      } @else {
        <p class="reports-empty">No se encontraron datos para el período seleccionado.</p>
      }
    </at-page-section>
  `,
  styles: `
    .filter-bar {
      margin-bottom: var(--at-s5);
      padding: var(--at-s4);
      background: var(--at-surface);
      border: 1px solid var(--at-border);
      border-left: 2px solid var(--at-border);
      transition: border-left-color var(--at-dur-fast) var(--at-ease);
    }
    .filter-bar.is-active {
      border-left-color: var(--at-mercury);
    }
    .filter-bar__chip {
      display: inline-flex;
      align-items: center;
      gap: var(--at-s2);
      margin: var(--at-s3) 0 0;
      padding: var(--at-s1) var(--at-s3);
      background: var(--at-surface-2);
      border: 1px solid var(--at-border-hi);
      color: var(--at-text);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      letter-spacing: var(--at-tracking-wide);
      text-transform: uppercase;
    }
    .filter-bar__chip-dot {
      width: 6px;
      height: 6px;
      background: var(--at-mercury);
      border-radius: 50%;
      box-shadow: 0 0 6px var(--at-mercury);
    }
    .filter-bar__form {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--at-s5);
    }
    .filter-bar__group {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--at-s3);
    }
    .filter-bar__actions {
      display: flex;
      align-items: stretch;
      gap: var(--at-s2);
      margin-left: auto;
    }
    .filter-bar__field {
      display: flex;
      flex-direction: column;
      gap: var(--at-s1);
      font-size: var(--at-fs-xs);
      color: var(--at-text-muted);
      font-family: var(--at-font-mono);
      letter-spacing: var(--at-tracking-wide);
      text-transform: uppercase;
    }
    .filter-bar__input {
      min-width: 9.5rem;
      height: 2.25rem;
      padding-block: 0;
    }
    .filter-bar__btn {
      height: 2.25rem;
      padding-block: 0;
      font-size: var(--at-fs-xs);
      border: 1px solid var(--at-border-hi);
    }
    .filter-bar__btn[type='submit'] {
      border-color: var(--at-mercury);
      color: var(--at-text);
    }
    .filter-bar__btn[type='submit']:hover:not(:disabled) {
      background: var(--at-surface-2);
      color: var(--at-mercury);
    }
    @media (max-width: 640px) {
      .filter-bar__actions { margin-left: 0; width: 100%; }
      .filter-bar__btn { flex: 1 1 0; }
    }
    .kpi-row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--at-s3);
      margin-bottom: var(--at-s4);
    }
    .report-article { margin-bottom: var(--at-s4); }
    .report-article__title {
      font-size: var(--at-fs-base);
      font-weight: 800;
      color: var(--at-text-muted);
      margin-bottom: var(--at-s2);
    }
    .reports-empty { color: var(--at-text-muted); font-style: italic; }

  `,
})
export class ReportsDashboardPage {
  private readonly api = inject(ReportsApiService);
  private readonly problemMapper = inject(ProblemErrorMapper);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly metrics = signal<DashboardMetricsView | null>(null);

  /** Rango aplicado en la última carga exitosa. Vacío si no hay filtro. */
  private readonly appliedRange = signal<{ from: string; to: string }>({ from: '', to: '' });

  protected readonly hasActiveFilter = computed(() => {
    const { from, to } = this.appliedRange();
    return from !== '' || to !== '';
  });

  protected readonly activeFilterLabel = computed(() => {
    const { from, to } = this.appliedRange();
    if (from !== '' && to !== '') return `${from} → ${to}`;
    if (from !== '') return `Desde ${from}`;
    if (to !== '') return `Hasta ${to}`;
    return '';
  });

  protected readonly filterForm = this.fb.nonNullable.group({
    dateFrom: this.fb.nonNullable.control(''),
    dateTo: this.fb.nonNullable.control(''),
  });

  constructor() {
    this.load();
  }

  protected clearFilter(): void {
    this.filterForm.reset();
    this.load();
  }

  protected load(): void {
    this.errorMessage.set(null);
    this.loading.set(true);

    const { dateFrom, dateTo } = this.filterForm.getRawValue();
    this.appliedRange.set({ from: dateFrom, to: dateTo });

    this.api
      .getDashboard({
        dateFrom: dateFrom !== '' ? dateFrom : undefined,
        dateTo: dateTo !== '' ? dateTo : undefined,
      })
      .pipe(
        map((raw) => adaptDashboardMetrics(raw)),
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          this.errorMessage.set(p?.detail ?? p?.title ?? 'No se pudieron cargar las métricas.');
          return EMPTY;
        }),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((view) => this.metrics.set(view));
  }
}
