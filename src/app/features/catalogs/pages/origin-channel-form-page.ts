import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, EMPTY, finalize } from 'rxjs';

import { ProblemErrorMapper } from '@core/http/problem-error.mapper';
import { messageFor } from '@shared/i18n/validation-messages';
import { ErrorSummary } from '@shared/ui/error-summary/error-summary';
import { FormField } from '@shared/ui/form-field/form-field';
import { applyProblemToForm, clearServerErrors } from '@shared/utils/problem-field-mapper';
import type { ErrorSummaryItem } from '@shared/utils/problem-field-mapper';

import { CatalogAdminApiService } from '../data-access/catalog-admin-api.service';
import type { CreateOriginChannelBody } from '../models/catalog-admin.types';

const OC_CONTROL_IDS = {
  name: 'oc-name',
} as const;

@Component({
  selector: 'at-origin-channel-form-page',
  imports: [ReactiveFormsModule, RouterLink, FormField, ErrorSummary],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="form-page">
      <header class="form-page__head">
        <a
          class="form-page__back"
          routerLink="/app/catalogs/origin-channels"
          aria-label="Volver al listado"
        >
          <span aria-hidden="true">←</span> Listado
        </a>
        <h2 class="form-page__title">
          {{ isEdit() ? 'Editar canal de origen' : 'Nuevo canal de origen' }}
        </h2>
      </header>

      @if (loadError()) {
        <p class="field__error" role="alert">{{ loadError() }}</p>
      } @else {
        <div class="card">
          @if (summaryItems().length > 0) {
            <at-error-summary [items]="summaryItems()" />
          }

          <form class="edit-form" [formGroup]="form" (ngSubmit)="submit()">
            <at-form-field
              label="Nombre"
              controlId="oc-name"
              [required]="true"
              [errorMessage]="nameError()"
              [invalid]="form.controls.name.invalid && form.controls.name.touched"
            >
              <input
                class="input"
                id="oc-name"
                type="text"
                formControlName="name"
                maxlength="100"
                autocomplete="off"
                aria-required="true"
                [attr.aria-invalid]="form.controls.name.invalid && form.controls.name.touched"
                [attr.aria-describedby]="
                  form.controls.name.invalid && form.controls.name.touched ? 'oc-name-error' : null
                "
              />
            </at-form-field>

            <div class="form-actions">
              <a
                class="btn btn--ghost form-actions__btn"
                routerLink="/app/catalogs/origin-channels"
              >
                Cancelar
              </a>
              <button
                class="btn btn--primary form-actions__btn"
                type="submit"
                [disabled]="submitting() || loadingItem()"
              >
                {{ submitting() ? 'Guardando…' : isEdit() ? 'Guardar' : 'Crear' }}
              </button>
            </div>
          </form>
        </div>
      }
    </section>
  `,
  styles: `
    .form-page {
      padding: var(--at-s6);
      max-width: 560px;
      margin: 0 auto;
    }
    .form-page__head {
      display: flex;
      flex-direction: column;
      gap: var(--at-s2);
      margin-bottom: var(--at-s5);
    }
    .form-page__back {
      align-self: flex-start;
      display: inline-flex;
      align-items: center;
      gap: var(--at-s1);
      padding: var(--at-s1) var(--at-s2);
      color: var(--at-text-muted);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      letter-spacing: var(--at-tracking-wide);
      text-transform: uppercase;
      text-decoration: none;
      transition: color var(--at-dur-fast) var(--at-ease);
    }
    .form-page__back:hover {
      color: var(--at-mercury);
    }
    .form-page__title {
      font-size: var(--at-fs-xl);
      font-weight: 800;
      letter-spacing: var(--at-tracking-tight);
      margin: 0;
    }
    .card {
      background: var(--at-surface);
      border: 1px solid var(--at-border);
      padding: var(--at-s6);
    }
    .edit-form {
      display: flex;
      flex-direction: column;
      gap: var(--at-s4);
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--at-s2);
      margin-top: var(--at-s2);
      padding-top: var(--at-s4);
      border-top: 1px solid var(--at-border);
    }
    .form-actions__btn {
      min-width: 8rem;
      justify-content: center;
    }
    @media (max-width: 480px) {
      .form-actions {
        flex-direction: column-reverse;
      }
      .form-actions__btn {
        width: 100%;
      }
    }
  `,
})
export class OriginChannelFormPage {
  private readonly api = inject(CatalogAdminApiService);
  private readonly problemMapper = inject(ProblemErrorMapper);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loadingItem = signal(false);
  protected readonly submitting = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly summaryItems = signal<readonly ErrorSummaryItem[]>([]);

  private readonly channelId = signal<number | null>(null);
  protected readonly isEdit = computed(() => this.channelId() !== null);

  protected readonly form = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
  });

  // Error message computed
  protected readonly nameError = computed(() => {
    const ctrl = this.form.controls.name;
    if (!ctrl.touched || ctrl.valid) return null;
    const errs = ctrl.errors;
    if (!errs) return null;
    const key = Object.keys(errs)[0];
    return messageFor(key, errs[key]);
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null) {
      const parsed = Number(idParam);
      if (!Number.isNaN(parsed)) {
        this.channelId.set(parsed);
        this.loadItem(parsed);
      }
    }
  }

  private loadItem(id: number): void {
    this.loadingItem.set(true);
    this.api
      .getOriginChannelById(id)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          this.loadError.set(p?.detail ?? p?.title ?? 'No pudimos cargar este canal de origen.');
          return EMPTY;
        }),
        finalize(() => this.loadingItem.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((item) => {
        this.form.setValue({ name: item.name ?? '' });
      });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    clearServerErrors(this.form);
    this.summaryItems.set([]);

    const body: CreateOriginChannelBody = {
      name: this.form.getRawValue().name.trim(),
    };

    this.submitting.set(true);

    const id = this.channelId();
    const request$ =
      id !== null ? this.api.updateOriginChannel(id, body) : this.api.createOriginChannel(body);

    request$
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          const { remainingGlobal } = applyProblemToForm(p, this.form, OC_CONTROL_IDS);
          this.summaryItems.set(
            remainingGlobal.length > 0
              ? remainingGlobal
              : [{ field: null, message: 'No pudimos guardar el canal de origen.' }],
          );
          return EMPTY;
        }),
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        void this.router.navigate(['/app/catalogs/origin-channels']);
      });
  }
}
