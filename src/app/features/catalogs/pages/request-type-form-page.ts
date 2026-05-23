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

import { CatalogAdminApiService } from '../data-access/catalog-admin-api.service';
import type { CreateRequestTypeBody } from '../models/catalog-admin.types';

@Component({
  selector: 'at-request-type-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="form-page">
      <header class="form-page__head">
        <a
          class="form-page__back"
          routerLink="/app/catalogs/request-types"
          aria-label="Volver al listado"
        >
          <span aria-hidden="true">←</span> Listado
        </a>
        <h2 class="form-page__title">
          {{ isEdit() ? 'Editar tipo de solicitud' : 'Nuevo tipo de solicitud' }}
        </h2>
      </header>

      @if (loadError()) {
        <p class="field__error" role="alert">{{ loadError() }}</p>
      } @else {
        <div class="card">
          <form class="edit-form" [formGroup]="form" (ngSubmit)="submit()">
            <div class="field">
              <label class="field__label" for="rt-name">
                Nombre <span class="field__req" aria-hidden="true">*</span>
              </label>
              <input
                class="input"
                id="rt-name"
                type="text"
                formControlName="name"
                maxlength="100"
                autocomplete="off"
              />
              @if (form.controls.name.invalid && form.controls.name.touched) {
                <span class="field__error" role="alert">
                  El nombre es requerido (máx. 100 caracteres).
                </span>
              }
            </div>

            <div class="field">
              <label class="field__label" for="rt-desc">Descripción</label>
              <textarea
                class="input"
                id="rt-desc"
                rows="4"
                formControlName="description"
                maxlength="500"
              ></textarea>
              @if (form.controls.description.invalid && form.controls.description.touched) {
                <span class="field__error" role="alert">Máximo 500 caracteres.</span>
              }
            </div>

            @if (submitError()) {
              <p class="field__error" role="alert">{{ submitError() }}</p>
            }

            <div class="form-actions">
              <a class="btn btn--ghost form-actions__btn" routerLink="/app/catalogs/request-types">
                Cancelar
              </a>
              <button
                class="btn btn--primary form-actions__btn"
                type="submit"
                [disabled]="form.invalid || submitting() || loadingItem()"
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
    .field {
      display: flex;
      flex-direction: column;
      gap: var(--at-s2);
    }
    .field__label {
      font-size: var(--at-fs-xs);
      color: var(--at-text-muted);
      font-family: var(--at-font-mono);
      letter-spacing: var(--at-tracking-wide);
      text-transform: uppercase;
    }
    .field__req {
      color: var(--at-danger);
    }
    .field__error {
      font-size: var(--at-fs-sm);
      color: var(--at-danger);
      padding: var(--at-s1) var(--at-s2);
      background: var(--at-err-bg);
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
export class RequestTypeFormPage {
  private readonly api = inject(CatalogAdminApiService);
  private readonly problemMapper = inject(ProblemErrorMapper);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loadingItem = signal(false);
  protected readonly submitting = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitError = signal<string | null>(null);

  private readonly typeId = signal<number | null>(null);
  protected readonly isEdit = computed(() => this.typeId() !== null);

  protected readonly form = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    description: this.fb.nonNullable.control('', [Validators.maxLength(500)]),
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null) {
      const parsed = Number(idParam);
      if (!Number.isNaN(parsed)) {
        this.typeId.set(parsed);
        this.loadItem(parsed);
      }
    }
  }

  private loadItem(id: number): void {
    this.loadingItem.set(true);
    this.api
      .getRequestTypeById(id)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          this.loadError.set(p?.detail ?? p?.title ?? 'No pudimos cargar este tipo de solicitud.');
          return EMPTY;
        }),
        finalize(() => this.loadingItem.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((item) => {
        this.form.setValue({
          name: item.name ?? '',
          description: item.description ?? '',
        });
      });
  }

  protected submit(): void {
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const body: CreateRequestTypeBody = { name: v.name };
    if (v.description.trim() !== '') {
      body.description = v.description.trim();
    }

    this.submitError.set(null);
    this.submitting.set(true);

    const id = this.typeId();
    const request$ =
      id !== null ? this.api.updateRequestType(id, body) : this.api.createRequestType(body);

    request$
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          this.submitError.set(p?.detail ?? p?.title ?? 'No pudimos guardar el tipo de solicitud.');
          return EMPTY;
        }),
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        void this.router.navigate(['/app/catalogs/request-types']);
      });
  }
}
