import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, EMPTY, finalize } from 'rxjs';

import { AuthSessionStore } from '@core/auth/auth-session.store';
import { ProblemErrorMapper } from '@core/http/problem-error.mapper';
import { ErrorAlert } from '@shared/ui/error-alert';
import { LoadingState } from '@shared/ui/loading-state';
import { PageSection } from '@shared/ui/page-section';
import { PaginationNav } from '@shared/ui/pagination-nav';
import { SegTabs } from '@shared/ui/seg-tabs';
import { StateBadge } from '@shared/ui/state-badge';
import { STATUS_LABEL_MAP } from '@shared/models/request-status';
import { PriorityBadge } from '@shared/ui/priority-badge';
import { DateTimeLabelPipe } from '@shared/pipes/date-time-label.pipe';
import { DisplayLabelPipe } from '@shared/pipes/display-label.pipe';

import { RequestsApiService } from '../data-access/requests-api.service';
import type {
  ListRequestsQueryParams,
  RequestResponse,
  RequestStatusEnum,
} from '../models/request-api.types';

@Component({
  selector: 'at-request-list-page',
  imports: [
    RouterLink,
    PageSection,
    LoadingState,
    ErrorAlert,
    PaginationNav,
    SegTabs,
    StateBadge,
    PriorityBadge,
    DisplayLabelPipe,
    DateTimeLabelPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <at-page-section title="Solicitudes">
      @if (canCreateRequest()) {
        <p><a class="btn btn--sm" routerLink="/app/requests/new">+ Nueva solicitud</a></p>
      }

      <div class="fltbar">
        <at-seg-tabs
          [tabs]="statusTabs()"
          [activeId]="activeStatusId()"
          [groupLabel]="'Filtrar por estado'"
          (activeIdChange)="onStatusChange($event)"
        />
        <button class="btn btn--sm" type="button" (click)="applyFilters()">Filtrar</button>
      </div>

      <at-error-alert [message]="errorMessage()" />

      @if (loading()) {
        <at-loading-state />
      } @else {
        <table class="tbl">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Estado</th>
              <th scope="col">Tipo</th>
              <th scope="col">Registro</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (r of rows(); track r.id) {
              <tr>
                <td>{{ r.id }}</td>
                <td>
                  @if (r.status) {
                    <at-state-badge [state]="r.status" />
                  } @else {
                    <span>—</span>
                  }
                </td>
                <td>{{ r.requestType?.name ?? '—' }}</td>
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

        <at-pagination-nav
          [currentPage]="currentPage()"
          [totalPages]="totalPages()"
          [loading]="loading()"
          (prev)="prevPage()"
          (next)="nextPage()"
        />
      }
    </at-page-section>
  `,
  styles: `
    .fltbar {
      display: flex;
      align-items: center;
      gap: var(--at-s3);
      margin-bottom: var(--at-s3);
      flex-wrap: wrap;
    }
  `,
})
export class RequestListPage {
  private readonly api = inject(RequestsApiService);
  private readonly problemMapper = inject(ProblemErrorMapper);
  private readonly session = inject(AuthSessionStore);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly canCreateRequest = computed(() => {
    const r = this.session.role();
    return r === 'STUDENT' || r === 'STAFF';
  });
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly rows = signal<RequestResponse[]>([]);
  protected readonly currentPage = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly pageSize = signal(20);

  protected readonly statusOptions: RequestStatusEnum[] = [
    'REGISTERED',
    'CLASSIFIED',
    'IN_PROGRESS',
    'ATTENDED',
    'CLOSED',
    'CANCELLED',
    'REJECTED',
  ];

  protected readonly filterForm = this.fb.nonNullable.group({
    status: this.fb.control<RequestStatusEnum | null>(null),
  });

  /** Tabs para SegTabs: null → '' (todos) + one per status. */
  protected readonly statusTabs = computed(() => [
    { id: '', label: 'Todos' },
    ...this.statusOptions.map((s) => ({ id: s, label: STATUS_LABEL_MAP[s] })),
  ]);

  /** Bridge reactive form value to a signal so computed() re-runs on changes. */
  private readonly statusValue$ = toSignal(
    this.filterForm.controls.status.valueChanges,
    { initialValue: this.filterForm.controls.status.value },
  );

  /** Active tab id: '' when filter is null (all), status string otherwise. */
  protected readonly activeStatusId = computed(() => this.statusValue$() ?? '');

  protected onStatusChange(id: string): void {
    const status = id === '' ? null : (id as RequestStatusEnum);
    this.filterForm.controls.status.setValue(status);
    this.currentPage.set(0);
    this.load();
  }

  constructor() {
    this.load();
  }

  protected applyFilters(): void {
    this.currentPage.set(0);
    this.load();
  }

  protected prevPage(): void {
    this.currentPage.update((p) => Math.max(0, p - 1));
    this.load();
  }

  protected nextPage(): void {
    this.currentPage.update((p) => p + 1);
    this.load();
  }

  private load(): void {
    this.errorMessage.set(null);
    this.loading.set(true);
    const f = this.filterForm.getRawValue();
    const q: ListRequestsQueryParams = {
      page: this.currentPage(),
      size: this.pageSize(),
      sort: 'registrationDateTime,desc',
    };
    if (f.status !== null) {
      q.status = f.status;
    }
    this.api
      .listRequests(q)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          this.errorMessage.set(
            p?.detail ?? p?.title ?? 'No pudimos cargar la lista de solicitudes.',
          );
          return EMPTY;
        }),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => {
        this.rows.set(page.content ?? []);
        const tp = page.totalPages ?? 0;
        this.totalPages.set(tp > 0 ? tp : 1);
        if (page.currentPage !== undefined) {
          this.currentPage.set(page.currentPage);
        }
        if (page.pageSize !== undefined) {
          this.pageSize.set(page.pageSize);
        }
      });
  }
}
