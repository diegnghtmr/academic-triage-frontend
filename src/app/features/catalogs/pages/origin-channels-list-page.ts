import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, EMPTY, finalize } from 'rxjs';

import { ProblemErrorMapper } from '@core/http/problem-error.mapper';
import { ActionBar } from '@shared/components/action-bar';
import { EmptyState } from '@shared/components/empty-state';
import { ErrorAlert } from '@shared/components/error-alert';
import { LoadingState } from '@shared/components/loading-state';
import { PageSection } from '@shared/components/page-section';
import { ActiveBadgePipe } from '@shared/pipes/active-badge.pipe';

import { CatalogAdminApiService } from '../data-access/catalog-admin-api.service';
import type { OriginChannelResponse } from '../models/catalog-admin.types';

@Component({
  selector: 'at-origin-channels-list-page',
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
    <at-page-section title="Canales de origen">
      <at-action-bar>
        <a class="btn btn--sm" routerLink="new">+ Nuevo canal</a>
        <button class="btn btn--sm btn--ghost" type="button" (click)="toggleFilter()">
          {{ showInactive() ? 'Ver solo activos' : 'Ver todos' }}
        </button>
      </at-action-bar>

      <at-error-alert [message]="errorMessage()" />

      @if (loading()) {
        <at-loading-state />
      } @else if (items().length === 0) {
        <at-empty-state message="No hay canales de origen registrados." />
      } @else {
        <table class="tbl">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Nombre</th>
              <th scope="col">Activo</th>
              <th scope="col"></th>
            </tr>
          </thead>
          <tbody>
            @for (item of items(); track item.id) {
              <tr>
                <td>{{ item.id }}</td>
                <td>{{ item.name }}</td>
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
      }
    </at-page-section>
  `,
})
export class OriginChannelsListPage {
  private readonly api = inject(CatalogAdminApiService);
  private readonly problemMapper = inject(ProblemErrorMapper);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly items = signal<OriginChannelResponse[]>([]);
  protected readonly showInactive = signal(false);

  constructor() {
    this.load();
  }

  protected toggleFilter(): void {
    this.showInactive.update((v) => !v);
    this.load();
  }

  private load(): void {
    this.errorMessage.set(null);
    this.loading.set(true);
    const active = this.showInactive() ? undefined : true;
    this.api
      .listOriginChannels(active)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          this.errorMessage.set(
            p?.detail ?? p?.title ?? 'No pudimos cargar la lista de canales de origen.',
          );
          return EMPTY;
        }),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((data) => this.items.set(data));
  }
}
