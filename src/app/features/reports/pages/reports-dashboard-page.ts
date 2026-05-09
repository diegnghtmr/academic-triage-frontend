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
            <header class="report-article__head">
              <h3 id="report-by-status" class="report-article__title">Por estado</h3>
              <div class="view-toggle" role="group" aria-label="Cambiar vista por estado">
                <button
                  type="button"
                  class="view-toggle__btn"
                  [class.is-active]="statusView() === 'chart'"
                  (click)="statusView.set('chart')"
                >Gráfica</button>
                <button
                  type="button"
                  class="view-toggle__btn"
                  [class.is-active]="statusView() === 'table'"
                  (click)="statusView.set('table')"
                >Tabla</button>
              </div>
            </header>
            @if (statusView() === 'chart') {
              <dl class="bar-chart" aria-labelledby="report-by-status">
                @for (entry of m.byStatus; track entry.key) {
                  <div
                    class="bar-chart__row"
                    [style.--pct.%]="(entry.value / statusMax()) * 100"
                  >
                    <dt class="bar-chart__label">{{ entry.key | displayLabel: 'requestStatus' }}</dt>
                    <dd class="bar-chart__bar">
                      <span
                        class="bar-chart__fill"
                        [attr.data-color]="statusColor(entry.key)"
                      ></span>
                    </dd>
                    <span class="bar-chart__value">
                      <span class="bar-chart__value-num">{{ entry.value }}</span>
                      <span class="bar-chart__value-pct">{{ percent(entry.value, m.totalRequests) }}%</span>
                    </span>
                  </div>
                }
              </dl>
            } @else {
              <table class="tbl">
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
            }
          </article>
        }

        @if (m.byPriority.length > 0) {
          <article class="report-article">
            <header class="report-article__head">
              <h3 id="report-by-priority" class="report-article__title">Por prioridad</h3>
              <div class="view-toggle" role="group" aria-label="Cambiar vista por prioridad">
                <button
                  type="button"
                  class="view-toggle__btn"
                  [class.is-active]="priorityView() === 'chart'"
                  (click)="priorityView.set('chart')"
                >Gráfica</button>
                <button
                  type="button"
                  class="view-toggle__btn"
                  [class.is-active]="priorityView() === 'table'"
                  (click)="priorityView.set('table')"
                >Tabla</button>
              </div>
            </header>
            @if (priorityView() === 'chart') {
              <dl class="bar-chart" aria-labelledby="report-by-priority">
                @for (entry of m.byPriority; track entry.key) {
                  <div
                    class="bar-chart__row"
                    [style.--pct.%]="(entry.value / priorityMax()) * 100"
                  >
                    <dt class="bar-chart__label">{{ entry.key | displayLabel: 'priority' }}</dt>
                    <dd class="bar-chart__bar">
                      <span
                        class="bar-chart__fill"
                        [attr.data-color]="priorityColor(entry.key)"
                      ></span>
                    </dd>
                    <span class="bar-chart__value">
                      <span class="bar-chart__value-num">{{ entry.value }}</span>
                      <span class="bar-chart__value-pct">{{ percent(entry.value, m.totalRequests) }}%</span>
                    </span>
                  </div>
                }
              </dl>
            } @else {
              <table class="tbl">
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
            }
          </article>
        }

        @if (m.byType.length > 0) {
          <article class="report-article">
            <header class="report-article__head">
              <h3 id="report-by-type" class="report-article__title">Por tipo</h3>
              <div class="view-toggle" role="group" aria-label="Cambiar vista por tipo">
                <button
                  type="button"
                  class="view-toggle__btn"
                  [class.is-active]="typeView() === 'chart'"
                  (click)="typeView.set('chart')"
                >Gráfica</button>
                <button
                  type="button"
                  class="view-toggle__btn"
                  [class.is-active]="typeView() === 'table'"
                  (click)="typeView.set('table')"
                >Tabla</button>
              </div>
            </header>
            @if (typeView() === 'chart') {
              <dl class="bar-chart" aria-labelledby="report-by-type">
                @for (entry of m.byType; track entry.key) {
                  <div
                    class="bar-chart__row"
                    [style.--pct.%]="(entry.value / typeMax()) * 100"
                  >
                    <dt class="bar-chart__label">{{ entry.key }}</dt>
                    <dd class="bar-chart__bar">
                      <span class="bar-chart__fill" data-color="mercury"></span>
                    </dd>
                    <span class="bar-chart__value">
                      <span class="bar-chart__value-num">{{ entry.value }}</span>
                      <span class="bar-chart__value-pct">{{ percent(entry.value, m.totalRequests) }}%</span>
                    </span>
                  </div>
                }
              </dl>
            } @else {
              <table class="tbl">
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
            }
          </article>
        }

        @if (m.topResponsibles.length > 0) {
          <article class="report-article">
            <header class="report-article__head">
              <h3 id="report-top-responsibles" class="report-article__title">Top responsables</h3>
              <div class="view-toggle" role="group" aria-label="Cambiar vista top responsables">
                <button
                  type="button"
                  class="view-toggle__btn"
                  [class.is-active]="topView() === 'chart'"
                  (click)="topView.set('chart')"
                >Podio</button>
                <button
                  type="button"
                  class="view-toggle__btn"
                  [class.is-active]="topView() === 'table'"
                  (click)="topView.set('table')"
                >Tabla</button>
              </div>
            </header>

            @if (topView() === 'chart') {
              @let podium = topPodium();
              <div class="podium" aria-labelledby="report-top-responsibles">
                @if (podium.silver) {
                  <div class="podium__slot podium__slot--silver">
                    <span class="podium__rank">#2</span>
                    <span class="avatar" [attr.data-initials]="initialsOf(podium.silver.user?.username ?? '')" aria-hidden="true"></span>
                    <p class="podium__name">{{ fullNameOf(podium.silver) }}</p>
                    @if (podium.silver.user?.username) {
                      <p class="podium__sub">@{{ podium.silver.user?.username }}</p>
                    }
                    <p class="podium__count">{{ podium.silver.resolvedCount ?? 0 }}</p>
                    <div class="podium__bar podium__bar--silver">
                      <span class="podium__bar-num">2</span>
                    </div>
                  </div>
                }
                @if (podium.gold) {
                  <div class="podium__slot podium__slot--gold">
                    <span class="podium__rank">#1</span>
                    <span class="avatar" [attr.data-initials]="initialsOf(podium.gold.user?.username ?? '')" aria-hidden="true"></span>
                    <p class="podium__name">{{ fullNameOf(podium.gold) }}</p>
                    @if (podium.gold.user?.username) {
                      <p class="podium__sub">@{{ podium.gold.user?.username }}</p>
                    }
                    <p class="podium__count">{{ podium.gold.resolvedCount ?? 0 }}</p>
                    <div class="podium__bar podium__bar--gold">
                      <span class="podium__bar-num">1</span>
                    </div>
                  </div>
                }
                @if (podium.bronze) {
                  <div class="podium__slot podium__slot--bronze">
                    <span class="podium__rank">#3</span>
                    <span class="avatar" [attr.data-initials]="initialsOf(podium.bronze.user?.username ?? '')" aria-hidden="true"></span>
                    <p class="podium__name">{{ fullNameOf(podium.bronze) }}</p>
                    @if (podium.bronze.user?.username) {
                      <p class="podium__sub">@{{ podium.bronze.user?.username }}</p>
                    }
                    <p class="podium__count">{{ podium.bronze.resolvedCount ?? 0 }}</p>
                    <div class="podium__bar podium__bar--bronze">
                      <span class="podium__bar-num">3</span>
                    </div>
                  </div>
                }
              </div>

              @if (m.topResponsibles.length > 3) {
                <ol class="podium-rest">
                  @for (entry of m.topResponsibles.slice(3); track entry.user?.id ?? $index; let i = $index) {
                    <li class="podium-rest__row">
                      <span class="podium-rest__rank">#{{ i + 4 }}</span>
                      <span class="podium-rest__name">{{ fullNameOf(entry) }}</span>
                      <span class="podium-rest__count">{{ entry.resolvedCount ?? 0 }}</span>
                    </li>
                  }
                </ol>
              }
            } @else {
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
            }
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

    .report-article__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--at-s3);
      margin-bottom: var(--at-s2);
    }
    .report-article__head .report-article__title {
      margin: 0;
    }
    .view-toggle {
      display: inline-flex;
      border: 1px solid var(--at-border-hi);
    }
    .view-toggle__btn {
      padding: var(--at-s1) var(--at-s3);
      background: transparent;
      border: 0;
      color: var(--at-text-muted);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      letter-spacing: var(--at-tracking-wide);
      text-transform: uppercase;
      cursor: pointer;
      transition: color var(--at-dur-fast) var(--at-ease),
                  background var(--at-dur-fast) var(--at-ease);
    }
    .view-toggle__btn + .view-toggle__btn {
      border-left: 1px solid var(--at-border-hi);
    }
    .view-toggle__btn:hover:not(.is-active) {
      color: var(--at-text);
    }
    .view-toggle__btn.is-active {
      background: var(--at-mercury);
      color: var(--at-bg);
    }

    .bar-chart {
      position: relative;
      margin: 0;
      padding: var(--at-s5) var(--at-s4) var(--at-s4);
      background:
        linear-gradient(
          to right,
          transparent calc(var(--at-s5) + 12rem),
          var(--at-border-hi) calc(var(--at-s5) + 12rem),
          var(--at-border-hi) calc(var(--at-s5) + 12rem + 1px),
          transparent calc(var(--at-s5) + 12rem + 1px)
        ),
        var(--at-surface);
      border: 1px solid var(--at-border-hi);
      display: flex;
      flex-direction: column;
      gap: var(--at-s4);
    }
    .bar-chart::before {
      content: '';
      position: absolute;
      top: 6px;
      right: var(--at-s4);
      left: calc(var(--at-s4) + 12rem + var(--at-s3));
      height: 4px;
      background-image: repeating-linear-gradient(
        to right,
        var(--at-border-hi) 0 1px,
        transparent 1px 25%
      );
      background-size: 100% 100%;
      opacity: 0.6;
    }
    .bar-chart__row {
      display: grid;
      grid-template-columns: 12rem minmax(0, 1fr) auto;
      gap: var(--at-s3);
      align-items: center;
    }
    .bar-chart__label {
      margin: 0;
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      font-weight: 700;
      letter-spacing: var(--at-tracking-wide);
      text-transform: uppercase;
      color: var(--at-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .bar-chart__bar {
      position: relative;
      margin: 0;
      height: 1.75rem;
      background:
        repeating-linear-gradient(
          to right,
          transparent 0 calc(25% - 1px),
          var(--at-border) calc(25% - 1px) 25%
        );
      border-top: 1px solid var(--at-border);
      border-bottom: 1px solid var(--at-border);
      overflow: hidden;
    }
    .bar-chart__fill {
      position: absolute;
      inset: 0 auto 0 0;
      width: var(--pct, 0%);
      background: var(--at-mercury);
      box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.4);
      transition: width var(--at-dur) var(--at-ease);
    }
    .bar-chart__fill::after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 2px;
      background: rgba(255, 255, 255, 0.6);
    }
    .bar-chart__fill[data-color="mercury"]    { background: var(--at-mercury); }
    .bar-chart__fill[data-color="info"]       { background: var(--at-info); }
    .bar-chart__fill[data-color="warning"]    { background: var(--at-warning); }
    .bar-chart__fill[data-color="success"]    { background: var(--at-success); }
    .bar-chart__fill[data-color="danger"]     { background: var(--at-danger); }
    .bar-chart__fill[data-color="muted"]      { background: var(--at-text-dim); }
    .bar-chart__value {
      display: inline-flex;
      align-items: baseline;
      gap: var(--at-s1);
      min-width: 4rem;
      justify-content: flex-end;
      font-family: var(--at-font-mono);
      font-variant-numeric: tabular-nums;
    }
    .bar-chart__value-num {
      font-size: var(--at-fs-base);
      font-weight: 700;
      color: var(--at-text);
    }
    .bar-chart__value-pct {
      font-size: var(--at-fs-xs);
      color: var(--at-text-dim);
    }

    .podium {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: var(--at-s2);
      align-items: end;
      padding: var(--at-s5) var(--at-s4) 0;
      background: var(--at-surface);
      border: 1px solid var(--at-border-hi);
    }
    .podium__slot {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--at-s2);
      text-align: center;
      min-width: 0;
    }
    .podium__slot--gold  { order: 2; }
    .podium__slot--silver { order: 1; }
    .podium__slot--bronze { order: 3; }
    .podium__rank {
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      font-weight: 700;
      letter-spacing: var(--at-tracking-wide);
      color: var(--at-text-dim);
    }
    .podium__slot--gold .podium__rank { color: var(--at-mercury); }
    .podium__slot .avatar {
      width: 48px;
      height: 48px;
    }
    .podium__slot--gold .avatar {
      width: 56px;
      height: 56px;
      border-color: var(--at-mercury);
    }
    .podium__name {
      margin: 0;
      font-weight: 700;
      color: var(--at-text);
      line-height: 1.2;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .podium__sub {
      margin: 0;
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      letter-spacing: var(--at-tracking-wide);
      color: var(--at-text-dim);
    }
    .podium__count {
      margin: 0;
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-lg);
      font-weight: 800;
      color: var(--at-text);
    }
    .podium__bar {
      position: relative;
      width: 100%;
      margin-top: var(--at-s2);
      border: 1px solid var(--at-border-hi);
      border-bottom: 0;
      box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.4);
    }
    .podium__bar--gold   { height: 7rem;   background: var(--at-mercury); }
    .podium__bar--silver { height: 5rem;   background: var(--at-text-muted); }
    .podium__bar--bronze { height: 3.5rem; background: var(--at-text-dim); }
    .podium__bar-num {
      position: absolute;
      top: var(--at-s2);
      left: 50%;
      transform: translateX(-50%);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-2xl);
      font-weight: 800;
      color: var(--at-bg);
      line-height: 1;
    }
    @media (max-width: 640px) {
      .podium { grid-template-columns: 1fr; }
      .podium__slot { order: initial !important; }
      .podium__bar { display: none; }
    }

    .podium-rest {
      list-style: none;
      padding: 0;
      margin: var(--at-s4) 0 0;
      display: flex;
      flex-direction: column;
      gap: 0;
      border: 1px solid var(--at-border);
    }
    .podium-rest__row {
      display: grid;
      grid-template-columns: 3rem 1fr auto;
      align-items: center;
      gap: var(--at-s3);
      padding: var(--at-s2) var(--at-s4);
      border-bottom: 1px solid var(--at-border);
      font-size: var(--at-fs-sm);
    }
    .podium-rest__row:last-child { border-bottom: 0; }
    .podium-rest__rank {
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      letter-spacing: var(--at-tracking-wide);
      color: var(--at-text-dim);
    }
    .podium-rest__name { color: var(--at-text); }
    .podium-rest__count {
      font-family: var(--at-font-mono);
      font-weight: 700;
      color: var(--at-text);
    }

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

  /** Vista activa por sección — chart por defecto, persistente entre reloads de filtros. */
  protected readonly statusView = signal<'chart' | 'table'>('chart');
  protected readonly priorityView = signal<'chart' | 'table'>('chart');
  protected readonly typeView = signal<'chart' | 'table'>('chart');
  protected readonly topView = signal<'chart' | 'table'>('chart');

  /** Top 3 del leaderboard organizado para el podio (gold/silver/bronze). */
  protected readonly topPodium = computed(() => {
    const list = this.metrics()?.topResponsibles ?? [];
    return {
      gold: list[0] ?? null,
      silver: list[1] ?? null,
      bronze: list[2] ?? null,
    };
  });

  protected fullNameOf(entry: { user?: { firstName?: string; lastName?: string; username?: string } }): string {
    const u = entry.user;
    if (!u) return '—';
    const fn = (u.firstName ?? '').trim();
    const ln = (u.lastName ?? '').trim();
    const full = `${fn} ${ln}`.trim();
    return full !== '' ? full : (u.username ?? '—');
  }

  protected initialsOf(name: string | null | undefined): string {
    if (!name) return '··';
    const trimmed = name.trim();
    if (trimmed === '') return '··';
    const parts = trimmed.split(/[._\s-]+/).filter((p) => p.length > 0);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  }

  /** Máximos para escalar las barras de cada chart. Mínimo 1 para evitar divisiones por 0. */
  protected readonly statusMax = computed(() => {
    const items = this.metrics()?.byStatus ?? [];
    return Math.max(1, ...items.map((e) => e.value));
  });
  protected readonly priorityMax = computed(() => {
    const items = this.metrics()?.byPriority ?? [];
    return Math.max(1, ...items.map((e) => e.value));
  });
  protected readonly typeMax = computed(() => {
    const items = this.metrics()?.byType ?? [];
    return Math.max(1, ...items.map((e) => e.value));
  });

  protected statusColor(key: string): string {
    const map: Record<string, string> = {
      REGISTERED: 'mercury',
      CLASSIFIED: 'info',
      IN_PROGRESS: 'warning',
      ATTENDED: 'success',
      CLOSED: 'muted',
      CANCELLED: 'muted',
      REJECTED: 'danger',
    };
    return map[key] ?? 'mercury';
  }

  protected percent(value: number, total: number): number {
    if (total <= 0) return 0;
    return Math.round((value / total) * 100);
  }

  protected priorityColor(key: string): string {
    const map: Record<string, string> = {
      HIGH: 'danger',
      MEDIUM: 'warning',
      LOW: 'success',
    };
    return map[key] ?? 'mercury';
  }

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
