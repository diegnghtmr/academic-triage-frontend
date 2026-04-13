import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, EMPTY, finalize } from 'rxjs';

import { AuthSessionStore } from '@core/auth/auth-session.store';
import { ProblemErrorMapper } from '@core/http/problem-error.mapper';
import { ActionBar } from '@shared/components/action-bar';
import { EmptyState } from '@shared/components/empty-state';
import { ErrorAlert } from '@shared/components/error-alert';
import { LoadingState } from '@shared/components/loading-state';
import { PageSection } from '@shared/components/page-section';
import { ActiveBadgePipe } from '@shared/pipes/active-badge.pipe';

import { adaptBusinessRuleListItem } from '../adapters/business-rule-list.adapter';
import { BusinessRulesApiService } from '../data-access/business-rules-api.service';
import type { BusinessRuleResponse } from '../models/business-rule.types';
import type { BusinessRuleListItemView } from '../models/business-rule-list-view';

@Component({
  selector: 'at-business-rules-list-page',
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
    <at-page-section title="Reglas de negocio">
      <at-action-bar>
        @if (isAdmin()) {
          <a routerLink="new">Nueva regla</a>
        }
        <button type="button" (click)="toggleFilter()">
          {{ showInactive() ? 'Ver solo activas' : 'Ver todas' }}
        </button>
      </at-action-bar>

      <at-error-alert [message]="errorMessage()" />
      <at-error-alert [message]="deleteError()" />

      @if (loading()) {
        <at-loading-state />
      } @else if (items().length === 0) {
        <at-empty-state message="No hay reglas de negocio registradas." />
      } @else {
        <table>
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Nombre</th>
              <th scope="col">Condición</th>
              <th scope="col">Detalle</th>
              <th scope="col">Prioridad resultante</th>
              <th scope="col">Activa</th>
              @if (isAdmin()) {
                <th scope="col">Acciones</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (item of items(); track item.id) {
              <tr>
                <td>{{ item.id }}</td>
                <td>{{ item.name }}</td>
                <td>{{ item.conditionLabel }}</td>
                <td>{{ item.conditionDetail }}</td>
                <td>{{ item.priorityLabel }}</td>
                <td>{{ item.active | activeBadge }}</td>
                @if (isAdmin()) {
                  <td>
                    @if (item.id !== undefined) {
                      <a
                        [routerLink]="[item.id, 'edit']"
                        [attr.aria-label]="'Editar regla ' + (item.name || item.id)"
                        >Editar</a
                      >
                      &nbsp;
                      <button
                        type="button"
                        [disabled]="deletingId() === item.id"
                        [attr.aria-label]="'Eliminar regla ' + (item.name || item.id)"
                        (click)="confirmDelete(item)"
                      >
                        @if (deletingId() === item.id) {
                          Eliminando…
                        } @else {
                          Eliminar
                        }
                      </button>
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      }
    </at-page-section>
  `,
})
export class BusinessRulesListPage {
  private readonly api = inject(BusinessRulesApiService);
  private readonly problemMapper = inject(ProblemErrorMapper);
  private readonly session = inject(AuthSessionStore);

  protected readonly isAdmin = computed(() => this.session.role() === 'ADMIN');

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly deleteError = signal<string | null>(null);
  protected readonly deletingId = signal<number | null>(null);
  protected readonly items = signal<BusinessRuleListItemView[]>([]);
  protected readonly showInactive = signal(false);

  constructor() {
    this.load();
  }

  protected toggleFilter(): void {
    this.showInactive.update((v) => !v);
    this.load();
  }

  protected confirmDelete(item: BusinessRuleListItemView): void {
    if (item.id === undefined) {
      return;
    }
    const confirmed = window.confirm(
      `¿Eliminar la regla "${item.name || item.id}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) {
      return;
    }
    this.deleteRule(item.id);
  }

  private load(): void {
    this.errorMessage.set(null);
    this.loading.set(true);
    const active = this.showInactive() ? undefined : true;
    this.api
      .list(active !== undefined ? { active } : undefined)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          this.errorMessage.set(
            p?.detail ?? p?.title ?? 'No pudimos cargar la lista de reglas de negocio.',
          );
          return EMPTY;
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((data) => this.items.set(data.map(adaptBusinessRuleListItem)));
  }

  private deleteRule(id: number): void {
    this.deleteError.set(null);
    this.deletingId.set(id);
    this.api
      .delete(id)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          this.deleteError.set(p?.detail ?? p?.title ?? 'No pudimos eliminar la regla de negocio.');
          return EMPTY;
        }),
        finalize(() => this.deletingId.set(null)),
      )
      .subscribe(() => {
        this.items.update((list) => list.filter((r) => r.id !== id));
      });
  }
}
