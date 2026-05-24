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
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
import { DateTimeLabelPipe } from '@shared/pipes/date-time-label.pipe';

import { EmptyState } from '@shared/ui/empty-state';

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
    EmptyState,
    PaginationNav,
    SegTabs,
    StateBadge,
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

      @if (loading() && rows().length === 0) {
        <at-loading-state />
      } @else {
        <div class="stale-wrap" [class.is-stale]="loading()" [attr.aria-busy]="loading()">
          @if (!loading() && rows().length === 0) {
            <at-empty-state message="No hay solicitudes que coincidan con los filtros." />
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
        </div>
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
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

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

  /** Tabs for SegTabs: null → '' (all) + one per status. */
  protected readonly statusTabs = computed(() => [
    { id: '', label: 'Todos' },
    ...this.statusOptions.map((s) => ({ id: s, label: STATUS_LABEL_MAP[s] })),
  ]);

  /**
   * Active tab id driven by the form control value.
   * The form is always updated (emitEvent: true) from the URL subscription,
   * so this computed re-runs whenever the URL changes.
   */
  protected readonly activeStatusId = computed(() => this.filterForm.controls.status.value ?? '');

  constructor() {
    // URL is the source of truth for status and page.
    // Any navigation (onStatusChange, prevPage, nextPage, applyFilters, browser back/forward)
    // goes through router.navigate and the queryParamMap subscription triggers load().
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const status = this.parseStatus(params.get('status'));
      const page = this.parsePage(params.get('page'));

      // emitEvent: true (default) so activeStatusId computed re-evaluates.
      this.filterForm.controls.status.setValue(status);
      this.currentPage.set(page);
      this.load();
    });
  }

  protected onStatusChange(id: string): void {
    const status = id === '' ? null : (id as RequestStatusEnum);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: status ?? null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected applyFilters(): void {
    const f = this.filterForm.getRawValue();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: f.status ?? null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected prevPage(): void {
    const next = Math.max(0, this.currentPage() - 1);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: next === 0 ? null : next },
      queryParamsHandling: 'merge',
    });
  }

  protected nextPage(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: this.currentPage() + 1 },
      queryParamsHandling: 'merge',
    });
  }

  private parseStatus(raw: string | null): RequestStatusEnum | null {
    const valid: RequestStatusEnum[] = [
      'REGISTERED',
      'CLASSIFIED',
      'IN_PROGRESS',
      'ATTENDED',
      'CLOSED',
      'CANCELLED',
      'REJECTED',
    ];
    return valid.includes(raw as RequestStatusEnum) ? (raw as RequestStatusEnum) : null;
  }

  private parsePage(raw: string | null): number {
    if (raw === null) return 0;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 0 ? n : 0;
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
