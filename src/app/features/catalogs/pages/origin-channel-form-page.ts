import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, EMPTY, finalize } from 'rxjs';

import { ProblemErrorMapper } from '@core/http/problem-error.mapper';

import { CatalogAdminApiService } from '../data-access/catalog-admin-api.service';
import type { CreateOriginChannelBody } from '../models/catalog-admin.types';

@Component({
  selector: 'at-origin-channel-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section">
      <h2 class="section__title">{{ isEdit() ? 'Editar canal de origen' : 'Nuevo canal de origen' }}</h2>
      <p class="section__back"><a routerLink="/app/catalogs/origin-channels">← Volver al listado</a></p>

      @if (loadError()) {
        <p class="field__error" role="alert">{{ loadError() }}</p>
      } @else {
        <div class="card">
          <form class="edit-form" [formGroup]="form" (ngSubmit)="submit()">
            <div class="field">
              <label class="field__label" for="oc-name">Nombre <span aria-hidden="true">*</span></label>
              <input
                class="input"
                id="oc-name"
                type="text"
                formControlName="name"
                maxlength="100"
                autocomplete="off"
              />
              @if (form.controls.name.invalid && form.controls.name.touched) {
                <span class="field__error" role="alert">El nombre es requerido (máx. 100 caracteres).</span>
              }
            </div>

            @if (submitError()) {
              <p class="field__error" role="alert">{{ submitError() }}</p>
            }

            <button class="btn btn--primary" type="submit" [disabled]="form.invalid || submitting() || loadingItem()">
              @if (submitting()) {
                Guardando…
              } @else {
                {{ isEdit() ? 'Guardar cambios' : 'Crear' }}
              }
            </button>
          </form>
        </div>
      }
    </section>
  `,
  styles: `
    .section { padding: var(--at-s6); max-width: 480px; }
    .section__title { font-size: var(--at-fs-xl); font-weight: 800; letter-spacing: var(--at-tracking-tight); margin-bottom: var(--at-s2); }
    .section__back { margin-bottom: var(--at-s4); font-size: var(--at-fs-sm); }
    .card { background: var(--at-surface); border: 1px solid var(--at-border); padding: var(--at-s5); }
    .edit-form { display: flex; flex-direction: column; gap: var(--at-s3); }
    .field { display: flex; flex-direction: column; gap: var(--at-s1); }
    .field__label { font-size: var(--at-fs-sm); color: var(--at-text-muted); font-family: var(--at-font-mono); }
    .field__error { font-size: var(--at-fs-sm); color: var(--at-danger); padding: var(--at-s1) var(--at-s2); background: var(--at-err-bg); }
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
  protected readonly submitError = signal<string | null>(null);

  private readonly channelId = signal<number | null>(null);
  protected readonly isEdit = computed(() => this.channelId() !== null);

  protected readonly form = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
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
      return;
    }
    const body: CreateOriginChannelBody = {
      name: this.form.getRawValue().name.trim(),
    };

    this.submitError.set(null);
    this.submitting.set(true);

    const id = this.channelId();
    const request$ =
      id !== null ? this.api.updateOriginChannel(id, body) : this.api.createOriginChannel(body);

    request$
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          this.submitError.set(p?.detail ?? p?.title ?? 'No pudimos guardar el canal de origen.');
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
