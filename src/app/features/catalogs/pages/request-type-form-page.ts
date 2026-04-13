import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
    <section>
      <h2>{{ isEdit() ? 'Editar tipo de solicitud' : 'Nuevo tipo de solicitud' }}</h2>
      <p><a routerLink="/app/catalogs/request-types">Volver al listado</a></p>

      @if (loadError()) {
        <p role="alert">{{ loadError() }}</p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div>
            <label for="rt-name">Nombre <span aria-hidden="true">*</span></label>
            <input
              id="rt-name"
              type="text"
              formControlName="name"
              maxlength="100"
              autocomplete="off"
            />
            @if (form.controls.name.invalid && form.controls.name.touched) {
              <span role="alert">El nombre es requerido (máx. 100 caracteres).</span>
            }
          </div>

          <div>
            <label for="rt-desc">Descripción</label>
            <textarea
              id="rt-desc"
              rows="4"
              formControlName="description"
              maxlength="500"
            ></textarea>
            @if (form.controls.description.invalid && form.controls.description.touched) {
              <span role="alert">Máximo 500 caracteres.</span>
            }
          </div>

          @if (submitError()) {
            <p role="alert">{{ submitError() }}</p>
          }

          <button type="submit" [disabled]="form.invalid || submitting() || loadingItem()">
            @if (submitting()) {
              Guardando…
            } @else {
              {{ isEdit() ? 'Guardar cambios' : 'Crear' }}
            }
          </button>
        </form>
      }
    </section>
  `,
})
export class RequestTypeFormPage {
  private readonly api = inject(CatalogAdminApiService);
  private readonly problemMapper = inject(ProblemErrorMapper);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

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
      )
      .subscribe(() => {
        void this.router.navigate(['/app/catalogs/request-types']);
      });
  }
}
