import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, EMPTY, finalize } from 'rxjs';

import type { RoleEnum, UserResponse } from '@core/auth/models/auth-api.types';
import { ProblemErrorMapper } from '@core/http/problem-error.mapper';
import { ActiveBadgePipe } from '@shared/pipes/active-badge.pipe';
import { DisplayLabelPipe } from '@shared/pipes/display-label.pipe';
import { EmptyState } from '@shared/components/empty-state';
import { ErrorAlert } from '@shared/components/error-alert';
import { LoadingState } from '@shared/components/loading-state';
import { PageSection } from '@shared/components/page-section';
import { PaginationNav } from '@shared/components/pagination-nav';

import { UsersApiService } from '../data-access/users-api.service';
import type { ListUsersQueryParams } from '../models/user-admin.types';

@Component({
  selector: 'at-users-list-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PageSection,
    LoadingState,
    ErrorAlert,
    EmptyState,
    PaginationNav,
    ActiveBadgePipe,
    DisplayLabelPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <at-page-section title="Usuarios">
      <div class="toolbar">
        <form class="toolbar__form" [formGroup]="filterForm" (ngSubmit)="applyFilters()">
          <label class="toolbar__field">
            <span>Rol</span>
            <select class="input input--sm" formControlName="role">
              <option [ngValue]="null">(todos)</option>
              @for (r of roleOptions; track r) {
                <option [ngValue]="r">{{ r | displayLabel: 'role' }}</option>
              }
            </select>
          </label>
          <label class="toolbar__field">
            <span>Estado</span>
            <select class="input input--sm" formControlName="active">
              <option [ngValue]="null">(todos)</option>
              <option [ngValue]="true">Activo</option>
              <option [ngValue]="false">Inactivo</option>
            </select>
          </label>
          <button class="btn btn--sm" type="submit" [disabled]="loading()">Filtrar</button>
        </form>
      </div>

      <at-error-alert [message]="errorMessage()" />

      @if (loading()) {
        <at-loading-state />
      } @else if (rows().length === 0) {
        <at-empty-state message="No hay usuarios que coincidan con los filtros." />
      } @else {
        <table class="tbl">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Usuario</th>
              <th scope="col">Nombre</th>
              <th scope="col">Email</th>
              <th scope="col">Rol</th>
              <th scope="col">Activo</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (u of rows(); track u.id) {
              <tr>
                <td>{{ u.id }}</td>
                <td>{{ u.username }}</td>
                <td>{{ u.firstName }} {{ u.lastName }}</td>
                <td>{{ u.email }}</td>
                <td>{{ u.role | displayLabel: 'role' }}</td>
                <td>{{ u.active | activeBadge }}</td>
                <td>
                  @if (u.id !== undefined) {
                    <a
                      class="btn btn--sm btn--ghost"
                      [routerLink]="[u.id, 'edit']"
                      [attr.aria-label]="'Editar usuario ' + u.username"
                      >Editar</a
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
    .toolbar { margin-bottom: var(--at-s3); }
    .toolbar__form {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--at-s3);
    }
    .toolbar__field {
      display: flex;
      flex-direction: column;
      gap: var(--at-s1);
      font-size: var(--at-fs-sm);
      color: var(--at-text-muted);
      font-family: var(--at-font-mono);
    }
  `,
})
export class UsersListPage {
  private readonly api = inject(UsersApiService);
  private readonly problemMapper = inject(ProblemErrorMapper);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly roleOptions: RoleEnum[] = ['ADMIN', 'STAFF', 'STUDENT'];

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly rows = signal<UserResponse[]>([]);
  protected readonly currentPage = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly pageSize = signal(20);

  protected readonly filterForm = this.fb.nonNullable.group({
    role: this.fb.control<RoleEnum | null>(null),
    active: this.fb.control<boolean | null>(null),
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
    const q: ListUsersQueryParams = {
      page: this.currentPage(),
      size: this.pageSize(),
      sort: 'username,asc',
    };
    if (f.role !== null) {
      q.role = f.role;
    }
    if (f.active !== null) {
      q.active = f.active;
    }

    this.api
      .list(q)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          this.errorMessage.set(
            p?.detail ?? p?.title ?? 'No pudimos cargar la lista de usuarios en este momento.',
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
        this.currentPage.set(page.currentPage ?? 0);
        this.pageSize.set(page.pageSize ?? this.pageSize());
      });
  }
}
