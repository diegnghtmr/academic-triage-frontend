import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, EMPTY, finalize } from 'rxjs';

import { ProblemErrorMapper } from '@core/http/problem-error.mapper';
import { ActionBar } from '@shared/ui/action-bar';
import { EmptyState } from '@shared/ui/empty-state';
import { ErrorAlert } from '@shared/ui/error-alert';
import { LoadingState } from '@shared/ui/loading-state';
import { PageSection } from '@shared/ui/page-section';
import { ActiveBadgePipe } from '@shared/pipes/active-badge.pipe';

import { CatalogAdminApiService } from '../data-access/catalog-admin-api.service';
import type { RequestTypeResponse } from '../models/catalog-admin.types';

@Component({
  selector: 'at-request-types-list-page',
  imports: [
    RouterLink,
    PageSection,
    ActionBar,
    LoadingState,
    ErrorAlert,
    EmptyState,
    ActiveBadgePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <at-page-section title="Tipos de solicitud">
      <at-action-bar>
        <a class="btn btn--sm" routerLink="new">+ Nuevo tipo</a>
        <button class="btn btn--sm btn--ghost" type="button" (click)="toggleFilter()">
          {{ showInactive() ? 'Ver solo activos' : 'Ver todos' }}
        </button>
      </at-action-bar>

      <at-error-alert [message]="errorMessage()" />

      @if (loading() && items().length === 0) {
        <at-loading-state />
      } @else if (items().length === 0) {
        <at-empty-state message="No hay tipos de solicitud registrados." />
      } @else {
        <div class="stale-wrap" [class.is-stale]="loading()" [attr.aria-busy]="loading()">
          <table class="tbl">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Nombre</th>
                <th scope="col">Descripción</th>
                <th scope="col">Activo</th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              @for (item of items(); track item.id) {
                <tr>
                  <td>{{ item.id }}</td>
                  <td>{{ item.name }}</td>
                  <td>{{ item.description ?? '—' }}</td>
                  <td>{{ item.active | activeBadge }}</td>
                  <td>
                    @if (item.id !== undefined) {
                      <a class="btn btn--sm btn--ghost" [routerLink]="[item.id, 'edit']">Editar</a>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </at-page-section>
  `,
})
export class RequestTypesListPage {
  private readonly api = inject(CatalogAdminApiService);
  private readonly problemMapper = inject(ProblemErrorMapper);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly items = signal<RequestTypeResponse[]>([]);
  protected readonly showInactive = signal(false);

  constructor() {
    // URL is the source of truth: subscribe to queryParamMap and trigger load on every change.
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.showInactive.set(params.get('inactive') === 'true');
        this.load();
      });
  }

  protected toggleFilter(): void {
    const next = !this.showInactive();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { inactive: next ? 'true' : null },
      queryParamsHandling: 'merge',
    });
  }

  private load(): void {
    this.errorMessage.set(null);
    this.loading.set(true);
    const active = this.showInactive() ? undefined : true;
    this.api
      .listRequestTypes(active)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          this.errorMessage.set(
            p?.detail ?? p?.title ?? 'No pudimos cargar la lista de tipos de solicitud.',
          );
          return EMPTY;
        }),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((data) => this.items.set(data));
  }
}
