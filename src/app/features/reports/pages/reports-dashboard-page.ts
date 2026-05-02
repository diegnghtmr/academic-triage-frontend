import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { catchError, EMPTY, finalize, map } from 'rxjs';

import { ProblemErrorMapper } from '@core/http/problem-error.mapper';
import { ErrorAlert } from '@shared/components/error-alert';
import { KpiCard } from '@shared/components/kpi-card';
import { LoadingState } from '@shared/components/loading-state';
import { PageSection } from '@shared/components/page-section';
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
      <div class="filter-bar">
        <form class="filter-bar__form" [formGroup]="filterForm" (ngSubmit)="load()">
          <label class="filter-bar__field">
            <span>Desde</span>
            <input class="input input--sm" type="date" formControlName="dateFrom" />
          </label>
          <label class="filter-bar__field">
            <span>Hasta</span>
            <input class="input input--sm" type="date" formControlName="dateTo" />
          </label>
          <button class="btn btn--sm" type="submit" [disabled]="loading()">
            {{ loading() ? 'Cargando…' : 'Aplicar' }}
          </button>
          <button class="btn btn--sm btn--ghost" type="button" (click)="clearFilter()" [disabled]="loading()">Sin filtro</button>
        </form>
      </div>

      <at-error-alert [message]="errorMessage()" />

      @if (loading()) {
        <at-loading-state message="Cargando métricas…" />
      } @else if (metrics()) {
        @let m = metrics()!;

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
      } @else {
        <p class="reports-empty">No se encontraron datos para el período seleccionado.</p>
      }
    </at-page-section>
  `,
  styles: `
    .filter-bar { margin-bottom: var(--at-s4); }
    .filter-bar__form {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--at-s3);
    }
    .filter-bar__field {
      display: flex;
      flex-direction: column;
      gap: var(--at-s1);
      font-size: var(--at-fs-sm);
      color: var(--at-text-muted);
      font-family: var(--at-font-mono);
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
