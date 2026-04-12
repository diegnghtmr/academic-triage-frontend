import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, finalize } from 'rxjs';
import { EMPTY } from 'rxjs';

import type {
  ListRequestsQueryParams,
  RequestResponse,
  RequestStatusEnum,
} from '../models/request-api.types';
import { AuthSessionStore } from '@core/auth/auth-session.store';
import { ProblemErrorMapper } from '@core/http/problem-error.mapper';

import { RequestsApiService } from '../data-access/requests-api.service';

@Component({
  selector: 'at-request-list-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h2>Solicitudes</h2>
      @if (canCreateRequest()) {
        <p><a routerLink="/app/requests/new">Nueva solicitud</a></p>
      }
      <form [formGroup]="filterForm" (ngSubmit)="applyFilters()">
        <label>
          Estado
          <select formControlName="status">
            <option [ngValue]="null">(todos)</option>
            @for (s of statusOptions; track s) {
              <option [ngValue]="s">{{ s }}</option>
            }
          </select>
        </label>
        <button type="submit">Filtrar</button>
      </form>
      @if (errorMessage()) {
        <p role="alert">{{ errorMessage() }}</p>
      }
      @if (loading()) {
        <p>Cargando…</p>
      } @else {
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Estado</th>
              <th>Tipo</th>
              <th>Registro</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (r of rows(); track $index) {
              <tr>
                <td>{{ r.id }}</td>
                <td>{{ r.status }}</td>
                <td>{{ r.requestType?.name }}</td>
                <td>{{ r.registrationDateTime }}</td>
                <td>
                  @if (r.id !== undefined) {
                    <a [routerLink]="['/app/requests', r.id]">Ver</a>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
        <nav>
          <button
            type="button"
            (click)="prevPage()"
            [disabled]="currentPage() <= 0 || loading()"
          >
            Anterior
          </button>
          <span
            >Página {{ currentPage() + 1 }} /
            {{ totalPages() || 1 }}</span
          >
          <button
            type="button"
            (click)="nextPage()"
            [disabled]="currentPage() >= totalPages() - 1 || loading()"
          >
            Siguiente
          </button>
        </nav>
      }
    </section>
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
            p?.detail ?? p?.title ?? 'No se pudo cargar el listado.',
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
