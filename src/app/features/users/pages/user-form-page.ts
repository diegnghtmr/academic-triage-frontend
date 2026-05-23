import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, EMPTY, finalize } from 'rxjs';

import type { RoleEnum } from '@core/auth/models/auth-api.types';
import { ProblemErrorMapper } from '@core/http/problem-error.mapper';
import { DisplayLabelPipe } from '@shared/pipes/display-label.pipe';

import { UsersApiService } from '../data-access/users-api.service';
import type { UpdateUserBody } from '../models/user-admin.types';

@Component({
  selector: 'at-user-form-page',
  imports: [ReactiveFormsModule, RouterLink, DisplayLabelPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section">
      <h2 class="section__title">Editar usuario</h2>
      <p class="section__back"><a routerLink="/app/users">← Volver al listado</a></p>

      @if (loadError()) {
        <p class="field__error" role="alert">{{ loadError() }}</p>
      } @else if (loadingItem()) {
        <p class="section__loading">Cargando datos del usuario…</p>
      } @else {
        <div class="card">
          @if (username()) {
            <p class="user-ref">
              <strong>Usuario:</strong> {{ username() }}
              <small>(no editable)</small>
            </p>
          }

          <form class="edit-form" [formGroup]="form" (ngSubmit)="submit()">
            <div class="field">
              <label class="field__label" for="uf-firstname"
                >Nombre <span aria-hidden="true">*</span></label
              >
              <input
                class="input"
                id="uf-firstname"
                type="text"
                formControlName="firstName"
                maxlength="75"
                autocomplete="given-name"
              />
              @if (form.controls.firstName.invalid && form.controls.firstName.touched) {
                <span class="field__error" role="alert"
                  >El nombre es requerido (máx. 75 caracteres).</span
                >
              }
            </div>

            <div class="field">
              <label class="field__label" for="uf-lastname"
                >Apellido <span aria-hidden="true">*</span></label
              >
              <input
                class="input"
                id="uf-lastname"
                type="text"
                formControlName="lastName"
                maxlength="75"
                autocomplete="family-name"
              />
              @if (form.controls.lastName.invalid && form.controls.lastName.touched) {
                <span class="field__error" role="alert"
                  >El apellido es requerido (máx. 75 caracteres).</span
                >
              }
            </div>

            <div class="field">
              <label class="field__label" for="uf-id"
                >Identificación <span aria-hidden="true">*</span></label
              >
              <input
                class="input"
                id="uf-id"
                type="text"
                formControlName="identification"
                maxlength="20"
                autocomplete="off"
              />
              @if (form.controls.identification.invalid && form.controls.identification.touched) {
                <span class="field__error" role="alert"
                  >La identificación es requerida (máx. 20 caracteres).</span
                >
              }
            </div>

            <div class="field">
              <label class="field__label" for="uf-email"
                >Email <span aria-hidden="true">*</span></label
              >
              <input
                class="input"
                id="uf-email"
                type="email"
                formControlName="email"
                autocomplete="email"
              />
              @if (form.controls.email.invalid && form.controls.email.touched) {
                <span class="field__error" role="alert">Ingrese un email válido.</span>
              }
            </div>

            <div class="field">
              <label class="field__label" for="uf-role"
                >Rol <span aria-hidden="true">*</span></label
              >
              <select class="input" id="uf-role" formControlName="role">
                @for (r of roleOptions; track r) {
                  <option [value]="r">{{ r | displayLabel: 'role' }}</option>
                }
              </select>
            </div>

            <div class="field field--checkbox">
              <label class="field__checkbox-label">
                <input type="checkbox" formControlName="active" />
                <span>Activo</span>
              </label>
            </div>

            @if (submitError()) {
              <p class="field__error" role="alert">{{ submitError() }}</p>
            }

            <button
              class="btn btn--primary"
              type="submit"
              [disabled]="form.invalid || submitting()"
            >
              @if (submitting()) {
                Guardando…
              } @else {
                Guardar cambios
              }
            </button>
          </form>
        </div>
      }
    </section>
  `,
  styles: `
    .section {
      padding: var(--at-s6);
      max-width: 560px;
    }
    .section__title {
      font-size: var(--at-fs-xl);
      font-weight: 800;
      letter-spacing: var(--at-tracking-tight);
      margin-bottom: var(--at-s2);
    }
    .section__back {
      margin-bottom: var(--at-s4);
      font-size: var(--at-fs-sm);
    }
    .section__loading {
      color: var(--at-text-muted);
      font-family: var(--at-font-mono);
    }
    .card {
      background: var(--at-surface);
      border: 1px solid var(--at-border);
      padding: var(--at-s5);
    }
    .user-ref {
      font-size: var(--at-fs-sm);
      color: var(--at-text-muted);
      margin-bottom: var(--at-s3);
      font-family: var(--at-font-mono);
    }
    .edit-form {
      display: flex;
      flex-direction: column;
      gap: var(--at-s3);
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: var(--at-s1);
    }
    .field__label {
      font-size: var(--at-fs-sm);
      color: var(--at-text-muted);
      font-family: var(--at-font-mono);
    }
    .field__error {
      font-size: var(--at-fs-sm);
      color: var(--at-danger);
      padding: var(--at-s1) var(--at-s2);
      background: var(--at-err-bg);
    }
    .field--checkbox .field__checkbox-label {
      display: flex;
      align-items: center;
      gap: var(--at-s2);
      font-size: var(--at-fs-sm);
      color: var(--at-text-muted);
      cursor: pointer;
    }
  `,
})
export class UserFormPage {
  private readonly api = inject(UsersApiService);
  private readonly problemMapper = inject(ProblemErrorMapper);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly roleOptions: RoleEnum[] = ['ADMIN', 'STAFF', 'STUDENT'];

  protected readonly loadingItem = signal(true);
  protected readonly submitting = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitError = signal<string | null>(null);
  /** `username` is read-only — displayed outside the form as a reference. */
  protected readonly username = signal<string | null>(null);

  private userId: number | null = null;

  protected readonly form = this.fb.nonNullable.group({
    firstName: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(75)]),
    lastName: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(75)]),
    identification: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(20),
    ]),
    email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    role: this.fb.nonNullable.control<RoleEnum>('STUDENT', Validators.required),
    active: this.fb.nonNullable.control(true),
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null) {
      const parsed = Number(idParam);
      if (!Number.isNaN(parsed)) {
        this.userId = parsed;
        this.loadUser(parsed);
      } else {
        this.loadError.set('No pudimos identificar el usuario que quieres editar.');
        this.loadingItem.set(false);
      }
    } else {
      this.loadError.set('Falta indicar qué usuario quieres editar.');
      this.loadingItem.set(false);
    }
  }

  private loadUser(id: number): void {
    this.api
      .getById(id)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          this.loadError.set(
            p?.detail ?? p?.title ?? 'No pudimos cargar la información del usuario.',
          );
          return EMPTY;
        }),
        finalize(() => this.loadingItem.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((user) => {
        this.username.set(user.username ?? null);
        this.form.setValue({
          firstName: user.firstName ?? '',
          lastName: user.lastName ?? '',
          identification: user.identification ?? '',
          email: user.email ?? '',
          role: user.role ?? 'STUDENT',
          active: user.active ?? true,
        });
      });
  }

  protected submit(): void {
    if (this.form.invalid || this.userId === null) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const body: UpdateUserBody = {
      firstName: v.firstName,
      lastName: v.lastName,
      identification: v.identification,
      email: v.email,
      role: v.role,
      active: v.active,
    };

    this.submitError.set(null);
    this.submitting.set(true);

    this.api
      .update(this.userId, body)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          this.submitError.set(
            p?.detail ?? p?.title ?? 'No pudimos guardar los cambios del usuario.',
          );
          return EMPTY;
        }),
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        void this.router.navigate(['/app/users']);
      });
  }
}
