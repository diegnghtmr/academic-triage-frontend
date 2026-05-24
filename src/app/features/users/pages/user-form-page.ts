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

import type { RoleEnum } from '@core/auth/models/auth-api.types';
import { ProblemErrorMapper } from '@core/http/problem-error.mapper';
import { DisplayLabelPipe } from '@shared/pipes/display-label.pipe';
import { CharacterCounter } from '@shared/ui/character-counter/character-counter';
import { ErrorSummary } from '@shared/ui/error-summary/error-summary';
import { FormField } from '@shared/ui/form-field/form-field';
import {
  applyProblemToForm,
  clearServerErrors,
} from '@shared/utils/problem-field-mapper';
import type { ErrorSummaryItem } from '@shared/utils/problem-field-mapper';
import { messageFor } from '@shared/i18n/validation-messages';

import { UsersApiService } from '../data-access/users-api.service';
import type { UpdateUserBody } from '../models/user-admin.types';

/** Stable DOM IDs for focus management. */
const USER_CONTROL_IDS: Readonly<Record<string, string>> = {
  firstName: 'uf-firstname',
  lastName: 'uf-lastname',
  identification: 'uf-id',
  email: 'uf-email',
  role: 'uf-role',
};

@Component({
  selector: 'at-user-form-page',
  imports: [ReactiveFormsModule, RouterLink, DisplayLabelPipe, FormField, ErrorSummary, CharacterCounter],
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

          @if (summaryItems().length > 0) {
            <at-error-summary [items]="summaryItems()" />
          }

          <form class="edit-form" [formGroup]="form" (ngSubmit)="submit()">
            <at-form-field
              label="Nombre"
              controlId="uf-firstname"
              [required]="true"
              [errorMessage]="firstNameError()"
              [invalid]="form.controls.firstName.invalid && form.controls.firstName.touched"
            >
              <input
                class="input"
                id="uf-firstname"
                type="text"
                formControlName="firstName"
                maxlength="75"
                autocomplete="given-name"
                aria-required="true"
                [attr.aria-invalid]="form.controls.firstName.invalid && form.controls.firstName.touched"
                [attr.aria-describedby]="form.controls.firstName.invalid && form.controls.firstName.touched ? 'uf-firstname-error' : null"
              />
              <at-character-counter
                [value]="form.controls.firstName.value"
                [max]="75"
              />
            </at-form-field>

            <at-form-field
              label="Apellido"
              controlId="uf-lastname"
              [required]="true"
              [errorMessage]="lastNameError()"
              [invalid]="form.controls.lastName.invalid && form.controls.lastName.touched"
            >
              <input
                class="input"
                id="uf-lastname"
                type="text"
                formControlName="lastName"
                maxlength="75"
                autocomplete="family-name"
                aria-required="true"
                [attr.aria-invalid]="form.controls.lastName.invalid && form.controls.lastName.touched"
                [attr.aria-describedby]="form.controls.lastName.invalid && form.controls.lastName.touched ? 'uf-lastname-error' : null"
              />
              <at-character-counter
                [value]="form.controls.lastName.value"
                [max]="75"
              />
            </at-form-field>

            <at-form-field
              label="Identificación"
              controlId="uf-id"
              [required]="true"
              [errorMessage]="identificationError()"
              [invalid]="form.controls.identification.invalid && form.controls.identification.touched"
            >
              <input
                class="input"
                id="uf-id"
                type="text"
                formControlName="identification"
                maxlength="20"
                autocomplete="off"
                aria-required="true"
                [attr.aria-invalid]="form.controls.identification.invalid && form.controls.identification.touched"
                [attr.aria-describedby]="form.controls.identification.invalid && form.controls.identification.touched ? 'uf-id-error' : null"
              />
              <at-character-counter
                [value]="form.controls.identification.value"
                [max]="20"
              />
            </at-form-field>

            <at-form-field
              label="Email"
              controlId="uf-email"
              [required]="true"
              [errorMessage]="emailError()"
              [invalid]="form.controls.email.invalid && form.controls.email.touched"
            >
              <input
                class="input"
                id="uf-email"
                type="email"
                formControlName="email"
                autocomplete="email"
                aria-required="true"
                [attr.aria-invalid]="form.controls.email.invalid && form.controls.email.touched"
                [attr.aria-describedby]="form.controls.email.invalid && form.controls.email.touched ? 'uf-email-error' : null"
              />
            </at-form-field>

            <at-form-field
              label="Rol"
              controlId="uf-role"
              [required]="true"
              [errorMessage]="roleError()"
              [invalid]="form.controls.role.invalid && form.controls.role.touched"
            >
              <select
                class="input"
                id="uf-role"
                formControlName="role"
                aria-required="true"
                [attr.aria-invalid]="form.controls.role.invalid && form.controls.role.touched"
                [attr.aria-describedby]="form.controls.role.invalid && form.controls.role.touched ? 'uf-role-error' : null"
              >
                @for (r of roleOptions; track r) {
                  <option [value]="r">{{ r | displayLabel: 'role' }}</option>
                }
              </select>
            </at-form-field>

            <div class="field field--checkbox">
              <label class="field__checkbox-label">
                <input type="checkbox" formControlName="active" />
                <span>Activo</span>
              </label>
            </div>

            <button
              class="btn btn--primary"
              type="submit"
              [disabled]="submitting()"
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
  /** `username` is read-only — displayed outside the form as a reference. */
  protected readonly username = signal<string | null>(null);
  protected readonly summaryItems = signal<readonly ErrorSummaryItem[]>([]);

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

  // Error message computeds
  protected readonly firstNameError = computed(() => {
    const ctrl = this.form.controls.firstName;
    if (!ctrl.touched || ctrl.valid) return null;
    const errs = ctrl.errors;
    if (!errs) return null;
    const key = Object.keys(errs)[0];
    return messageFor(key, errs[key]);
  });

  protected readonly lastNameError = computed(() => {
    const ctrl = this.form.controls.lastName;
    if (!ctrl.touched || ctrl.valid) return null;
    const errs = ctrl.errors;
    if (!errs) return null;
    const key = Object.keys(errs)[0];
    return messageFor(key, errs[key]);
  });

  protected readonly identificationError = computed(() => {
    const ctrl = this.form.controls.identification;
    if (!ctrl.touched || ctrl.valid) return null;
    const errs = ctrl.errors;
    if (!errs) return null;
    const key = Object.keys(errs)[0];
    return messageFor(key, errs[key]);
  });

  protected readonly emailError = computed(() => {
    const ctrl = this.form.controls.email;
    if (!ctrl.touched || ctrl.valid) return null;
    const errs = ctrl.errors;
    if (!errs) return null;
    const key = Object.keys(errs)[0];
    return messageFor(key, errs[key]);
  });

  protected readonly roleError = computed(() => {
    const ctrl = this.form.controls.role;
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

    clearServerErrors(this.form);
    this.summaryItems.set([]);
    this.submitting.set(true);

    const v = this.form.getRawValue();
    const body: UpdateUserBody = {
      firstName: v.firstName,
      lastName: v.lastName,
      identification: v.identification,
      email: v.email,
      role: v.role,
      active: v.active,
    };

    this.api
      .update(this.userId, body)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          const { remainingGlobal } = applyProblemToForm(p, this.form, USER_CONTROL_IDS);
          this.summaryItems.set(
            remainingGlobal.length > 0
              ? remainingGlobal
              : [{ field: null, message: 'No pudimos guardar los cambios del usuario.' }],
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
