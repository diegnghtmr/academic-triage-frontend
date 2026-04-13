import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, EMPTY, finalize } from 'rxjs';

import { AuthSessionStore } from '@core/auth/auth-session.store';
import { ProblemErrorMapper } from '@core/http/problem-error.mapper';
import { ErrorAlert } from '@shared/components/error-alert';
import { LoadingState } from '@shared/components/loading-state';
import { PageSection } from '@shared/components/page-section';
import { PaginationNav } from '@shared/components/pagination-nav';
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
    ReactiveFormsModule,
    RouterLink,
    PageSection,
    LoadingState,
    ErrorAlert,
    PaginationNav,
    DisplayLabelPipe,
    DateTimeLabelPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <at-page-section title="Solicitudes">
      @if (canCreateRequest()) {
        <p><a routerLink="/app/requests/new">Nueva solicitud</a></p>
      }

      <form [formGroup]="filterForm" (ngSubmit)="applyFilters()">
        <label>
          Estado
          <select formControlName="status">
            <option [ngValue]="null">(todos)</option>
            @for (s of statusOptions; track s) {
              <option [ngValue]="s">{{ s | displayLabel: 'requestStatus' }}</option>
            }
          </select>
        </label>
        <button type="submit">Filtrar</button>
      </form>

      <at-error-alert [message]="errorMessage()" />

      @if (loading()) {
        <at-loading-state />
      } @else {
        <table>
          <thead>
            <tr>
              <th scope="col">Número de solicitud</th>
              <th scope="col">Estado</th>
              <th scope="col">Tipo</th>
              <th scope="col">Registro</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (r of rows(); track $index) {
              <tr>
                <td>{{ r.id }}</td>
                <td>{{ r.status | displayLabel: 'requestStatus' }}</td>
                <td>{{ r.requestType?.name }}</td>
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
})
export class RequestListPage {
  private readonly api = inject(RequestsApiService);
  private readonly problemMapper = inject(ProblemErrorMapper);
  private readonly session = inject(AuthSessionStore);
  private readonly fb = inject(FormBuilder);

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
