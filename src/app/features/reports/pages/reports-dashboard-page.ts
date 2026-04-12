import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { catchError, EMPTY, finalize, map } from 'rxjs';

import { ProblemErrorMapper } from '@core/http/problem-error.mapper';
import { ErrorAlert } from '@shared/components/error-alert';
import { LoadingState } from '@shared/components/loading-state';
import { PageSection } from '@shared/components/page-section';

import { adaptDashboardMetrics } from '../adapters/dashboard-metrics.adapter';
import { ReportsApiService } from '../data-access/reports-api.service';
import type { DashboardMetricsView } from '../models/dashboard-metrics.types';

@Component({
  selector: 'at-reports-dashboard-page',
  imports: [ReactiveFormsModule, DecimalPipe, PageSection, LoadingState, ErrorAlert],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <at-page-section title="Reportes — Dashboard operativo">
      <form [formGroup]="filterForm" (ngSubmit)="load()">
        <label>
          Desde
          <input type="date" formControlName="dateFrom" />
        </label>
        <label>
          Hasta
          <input type="date" formControlName="dateTo" />
        </label>
        <button type="submit" [disabled]="loading()">
          {{ loading() ? 'Cargando…' : 'Aplicar' }}
        </button>
        <button type="button" (click)="clearFilter()" [disabled]="loading()">
          Sin filtro
        </button>
      </form>

      <at-error-alert [message]="errorMessage()" />

      @if (loading()) {
        <at-loading-state message="Cargando métricas…" />
      } @else if (metrics()) {
        @let m = metrics()!;

        <article>
          <h3>Total de solicitudes</h3>
          <p>{{ m.totalRequests }}</p>
        </article>

        @if (m.byStatus.length > 0) {
          <article>
            <h3 id="report-by-status">Por estado</h3>
            <table aria-labelledby="report-by-status">
              <thead>
                <tr><th scope="col">Estado</th><th scope="col">Cantidad</th></tr>
              </thead>
              <tbody>
                @for (entry of m.byStatus; track entry.key) {
                  <tr><td>{{ entry.key }}</td><td>{{ entry.value }}</td></tr>
                }
              </tbody>
            </table>
          </article>
        }

        @if (m.byType.length > 0) {
          <article>
            <h3 id="report-by-type">Por tipo</h3>
            <table aria-labelledby="report-by-type">
              <thead>
                <tr><th scope="col">Tipo</th><th scope="col">Cantidad</th></tr>
              </thead>
              <tbody>
                @for (entry of m.byType; track entry.key) {
                  <tr><td>{{ entry.key }}</td><td>{{ entry.value }}</td></tr>
                }
              </tbody>
            </table>
          </article>
        }

        @if (m.byPriority.length > 0) {
          <article>
            <h3 id="report-by-priority">Por prioridad</h3>
            <table aria-labelledby="report-by-priority">
              <thead>
                <tr><th scope="col">Prioridad</th><th scope="col">Cantidad</th></tr>
              </thead>
              <tbody>
                @for (entry of m.byPriority; track entry.key) {
                  <tr><td>{{ entry.key }}</td><td>{{ entry.value }}</td></tr>
                }
              </tbody>
            </table>
          </article>
        }

        @if (m.averageResolutionTimeHours !== null) {
          <article>
            <h3>Tiempo promedio de resolución</h3>
            <p>{{ m.averageResolutionTimeHours | number: '1.1-1' }} horas</p>
          </article>
        }

        @if (m.topResponsibles.length > 0) {
          <article>
            <h3 id="report-top-responsibles">Top responsables</h3>
            <table aria-labelledby="report-top-responsibles">
              <thead>
                <tr><th scope="col">Responsable</th><th scope="col">Resueltas</th></tr>
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
          </article>
        }
      } @else {
        <p>No hay datos disponibles para el período seleccionado.</p>
      }
    </at-page-section>
  `,
})
export class ReportsDashboardPage {
  private readonly api = inject(ReportsApiService);
  private readonly problemMapper = inject(ProblemErrorMapper);
  private readonly fb = inject(FormBuilder);

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
          this.errorMessage.set(
            p?.detail ?? p?.title ?? 'No se pudieron cargar las métricas.',
          );
          return EMPTY;
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((view) => this.metrics.set(view));
  }
}
