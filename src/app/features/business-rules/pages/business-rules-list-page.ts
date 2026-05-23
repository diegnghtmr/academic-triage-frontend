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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, EMPTY, finalize } from 'rxjs';

import { AuthSessionStore } from '@core/auth/auth-session.store';
import { ProblemErrorMapper } from '@core/http/problem-error.mapper';
import { ActionBar } from '@shared/ui/action-bar';
import { EmptyState } from '@shared/ui/empty-state';
import { ErrorAlert } from '@shared/ui/error-alert';
import { LoadingState } from '@shared/ui/loading-state';
import { ModalDialog } from '@shared/ui/modal-dialog';
import { PageSection } from '@shared/ui/page-section';
import { ActiveBadgePipe } from '@shared/pipes/active-badge.pipe';

import { adaptBusinessRuleListItem } from '../adapters/business-rule-list.adapter';
import { BusinessRulesApiService } from '../data-access/business-rules-api.service';
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
    ModalDialog,
    ActiveBadgePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <at-page-section title="Reglas de negocio">
      <at-action-bar>
        @if (isAdmin()) {
          <a class="btn btn--sm" routerLink="new">+ Nueva regla</a>
        }
        <button class="btn btn--sm btn--ghost" type="button" (click)="toggleFilter()">
          {{ showInactive() ? 'Ver solo activas' : 'Ver todas' }}
        </button>
      </at-action-bar>

      <at-error-alert [message]="errorMessage()" />
      <at-error-alert [message]="deleteError()" />

      @if (loading() && items().length === 0) {
        <at-loading-state />
      } @else if (items().length === 0) {
        <at-empty-state message="No hay reglas de negocio registradas." />
      } @else {
        <div class="stale-wrap" [class.is-stale]="loading()" [attr.aria-busy]="loading()">
          <table class="tbl">
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
                        <div class="row-actions">
                          <a
                            class="btn btn--sm btn--ghost row-actions__btn"
                            [routerLink]="[item.id, 'edit']"
                            [attr.aria-label]="'Editar regla ' + (item.name || item.id)"
                            >Editar</a
                          >
                          <button
                            class="btn btn--sm btn--danger row-actions__btn"
                            type="button"
                            [disabled]="deletingId() === item.id"
                            [attr.aria-label]="'Eliminar regla ' + (item.name || item.id)"
                            (click)="confirmDelete(item)"
                          >
                            {{ deletingId() === item.id ? 'Eliminando…' : 'Eliminar' }}
                          </button>
                        </div>
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <at-modal-dialog
        [open]="showDeleteModal() !== null"
        [title]="'Eliminar regla'"
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        (confirm)="onModalConfirm()"
        (modalCancel)="showDeleteModal.set(null)"
      >
        @if (showDeleteModal()) {
          <p>
            ¿Eliminar la regla &ldquo;{{ showDeleteModal()!.name || showDeleteModal()!.id }}&rdquo;?
            Esta acción no se puede deshacer.
          </p>
        }
      </at-modal-dialog>
    </at-page-section>
  `,
  styles: `
    .row-actions {
      display: flex;
      gap: var(--at-s2);
      flex-wrap: wrap;
    }
    .row-actions__btn {
      flex: 1 1 6rem;
      min-width: 6rem;
      justify-content: center;
    }
  `,
})
export class BusinessRulesListPage {
  private readonly api = inject(BusinessRulesApiService);
  private readonly problemMapper = inject(ProblemErrorMapper);
  private readonly session = inject(AuthSessionStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isAdmin = computed(() => this.session.role() === 'ADMIN');

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly deleteError = signal<string | null>(null);
  protected readonly deletingId = signal<number | null>(null);
  protected readonly items = signal<BusinessRuleListItemView[]>([]);
  protected readonly showInactive = signal(false);
  protected readonly showDeleteModal = signal<BusinessRuleListItemView | null>(null);

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
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

  protected confirmDelete(item: BusinessRuleListItemView): void {
    if (item.id === undefined) {
      return;
    }
    this.showDeleteModal.set(item);
  }

  protected onModalConfirm(): void {
    const item = this.showDeleteModal();
    if (item?.id === undefined) {
      this.showDeleteModal.set(null);
      return;
    }
    this.showDeleteModal.set(null);
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
        takeUntilDestroyed(this.destroyRef),
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
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.items.update((list) => list.filter((r) => r.id !== id));
      });
  }
}
