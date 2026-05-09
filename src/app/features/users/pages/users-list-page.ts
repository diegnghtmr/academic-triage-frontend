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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, EMPTY, finalize } from 'rxjs';

import type { RoleEnum, UserResponse } from '@core/auth/models/auth-api.types';
import { ProblemErrorMapper } from '@core/http/problem-error.mapper';
import { ActiveBadgePipe } from '@shared/pipes/active-badge.pipe';
import { DisplayLabelPipe } from '@shared/pipes/display-label.pipe';
import { EmptyState } from '@shared/ui/empty-state';
import { ErrorAlert } from '@shared/ui/error-alert';
import { LoadingState } from '@shared/ui/loading-state';
import { PageSection } from '@shared/ui/page-section';
import { PaginationNav } from '@shared/ui/pagination-nav';

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
      <div class="filter-bar" [class.is-active]="hasActiveFilter()">
        <form class="filter-bar__form" [formGroup]="filterForm" (ngSubmit)="applyFilters()">
          <div class="filter-bar__group">
            <label class="filter-bar__field">
              <span>Rol</span>
              <select class="input filter-bar__input" formControlName="role">
                <option [ngValue]="null">(todos)</option>
                @for (r of roleOptions; track r) {
                  <option [ngValue]="r">{{ r | displayLabel: 'role' }}</option>
                }
              </select>
            </label>
            <label class="filter-bar__field">
              <span>Estado</span>
              <select class="input filter-bar__input" formControlName="active">
                <option [ngValue]="null">(todos)</option>
                <option [ngValue]="true">Activo</option>
                <option [ngValue]="false">Inactivo</option>
              </select>
            </label>
          </div>
          <div class="filter-bar__actions">
            <button class="btn filter-bar__btn" type="submit" [disabled]="loading()">
              Filtrar
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

      @if (loading() && rows().length === 0) {
        <at-loading-state />
      } @else if (rows().length === 0) {
        <at-empty-state message="No hay usuarios que coincidan con los filtros." />
      } @else {
        <div class="stale-wrap" [class.is-stale]="loading()" [attr.aria-busy]="loading()">
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
        </div>
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
    @media (max-width: 640px) {
      .filter-bar__actions { margin-left: 0; width: 100%; }
      .filter-bar__btn { flex: 1 1 0; }
    }
  `,
})
export class UsersListPage {
  private readonly api = inject(UsersApiService);
  private readonly problemMapper = inject(ProblemErrorMapper);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

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

  /** Filtros aplicados en la última carga exitosa. Vacío si no hay filtro. */
  private readonly appliedFilters = signal<{ role: RoleEnum | null; active: boolean | null }>({
    role: null,
    active: null,
  });

  protected readonly hasActiveFilter = computed(() => {
    const f = this.appliedFilters();
    return f.role !== null || f.active !== null;
  });

  protected readonly activeFilterLabel = computed(() => {
    const f = this.appliedFilters();
    const parts: string[] = [];
    if (f.role !== null) parts.push(`Rol: ${f.role}`);
    if (f.active !== null) parts.push(f.active ? 'Activo' : 'Inactivo');
    return parts.join(' · ');
  });

  constructor() {
    // Sincroniza UI ↔ URL: la URL es la fuente de verdad para page/role/active.
    // Cualquier cambio (filtrar, paginar, clearFilter, back/forward del browser)
    // pasa por router.navigate y el subscribe de queryParams dispara load().
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const role = this.parseRole(params.get('role'));
        const active = this.parseActive(params.get('active'));
        const page = this.parsePage(params.get('page'));

        this.filterForm.setValue({ role, active }, { emitEvent: false });
        this.currentPage.set(page);
        this.load();
      });
  }

  protected applyFilters(): void {
    const f = this.filterForm.getRawValue();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.toQueryParams(f.role, f.active, 0),
      queryParamsHandling: 'merge',
    });
  }

  protected clearFilter(): void {
    this.filterForm.reset({ role: null, active: null });
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { role: null, active: null, page: null },
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

  private toQueryParams(
    role: RoleEnum | null,
    active: boolean | null,
    page: number,
  ): Record<string, string | null> {
    return {
      role: role ?? null,
      active: active === null ? null : String(active),
      page: page === 0 ? null : String(page),
    };
  }

  private parseRole(raw: string | null): RoleEnum | null {
    if (raw === 'ADMIN' || raw === 'STAFF' || raw === 'STUDENT') return raw;
    return null;
  }

  private parseActive(raw: string | null): boolean | null {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return null;
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
    this.appliedFilters.set({ role: f.role, active: f.active });
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
