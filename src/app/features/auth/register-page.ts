import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, EMPTY, finalize } from 'rxjs';

import type { RegisterRequest } from '@core/auth/models/auth-api.types';
import { ProblemErrorMapper } from '@core/http/problem-error.mapper';
import { ErrorSummary } from '@shared/ui/error-summary/error-summary';
import { FormField } from '@shared/ui/form-field/form-field';
import { PasswordField } from '@shared/ui/password-field/password-field';
import {
  applyProblemToForm,
  clearServerErrors,
} from '@shared/utils/problem-field-mapper';
import type { ErrorSummaryItem } from '@shared/utils/problem-field-mapper';

import { messageFor } from '../../shared/i18n/validation-messages';
import { AuthApiService } from './auth-api.service';

/**
 * Stable control IDs — used by `<at-form-field>` and as controlIdMap keys
 * for ProblemFieldMapper. Export for test assertions.
 */
export const REGISTER_CONTROL_IDS = {
  username: 'reg-username',
  email: 'reg-email',
  password: 'reg-password',
  firstName: 'reg-first',
  lastName: 'reg-last',
  identification: 'reg-id',
} as const;

/**
 * Public registration (`POST /auth/register`).
 *
 * REQ-NO-AUTO-LOGIN: on success, redirects to `/auth/login?registered=1`
 * — no session is created, no auto-login is performed.
 * This is a STUDENT self-registration form.
 */
@Component({
  selector: 'at-register-page',
  imports: [ReactiveFormsModule, RouterLink, FormField, PasswordField, ErrorSummary],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="reg-wrap">
      <div class="reg-wrap__inner">
        <h1 class="reg-wrap__title">Registro de Estudiante</h1>
        <p class="reg-wrap__subtitle">
          Creá tu cuenta STUDENT. Al registrarte, serás redirigido a
          <a routerLink="/auth/login">iniciar sesión</a> — no se realiza inicio de
          sesión automático.
        </p>

        <at-error-summary
          #errorSummaryEl
          [items]="globalErrors()"
          (focusFirst)="focusSummaryTarget($event)"
        />

        <form class="reg-form" [formGroup]="form" (ngSubmit)="submit()">

          <at-form-field
            label="Usuario"
            [controlId]="ids.username"
            [required]="true"
            [invalid]="isInvalid('username')"
            [errorMessage]="errorFor('username')"
          >
            <input
              class="input"
              [id]="ids.username"
              type="text"
              formControlName="username"
              autocomplete="username"
              [attr.aria-invalid]="isInvalid('username') || null"
              [attr.aria-describedby]="describedBy('username')"
            />
          </at-form-field>

          <at-form-field
            label="Correo electrónico"
            [controlId]="ids.email"
            [required]="true"
            [invalid]="isInvalid('email')"
            [errorMessage]="errorFor('email')"
          >
            <input
              class="input"
              [id]="ids.email"
              type="email"
              formControlName="email"
              autocomplete="email"
              [attr.aria-invalid]="isInvalid('email') || null"
              [attr.aria-describedby]="describedBy('email')"
            />
          </at-form-field>

          <at-form-field
            label="Contraseña"
            [controlId]="ids.password"
            [required]="true"
            [invalid]="isInvalid('password')"
            [errorMessage]="errorFor('password')"
          >
            <at-password-field
              [controlId]="ids.password"
              autocomplete="new-password"
              formControlName="password"
              [ariaDescribedBy]="describedBy('password')"
              [ariaInvalid]="isInvalid('password')"
            />
          </at-form-field>

          <at-form-field
            label="Nombre"
            [controlId]="ids.firstName"
            [required]="true"
            [invalid]="isInvalid('firstName')"
            [errorMessage]="errorFor('firstName')"
          >
            <input
              class="input"
              [id]="ids.firstName"
              type="text"
              formControlName="firstName"
              autocomplete="given-name"
              [attr.aria-invalid]="isInvalid('firstName') || null"
              [attr.aria-describedby]="describedBy('firstName')"
            />
          </at-form-field>

          <at-form-field
            label="Apellido"
            [controlId]="ids.lastName"
            [required]="true"
            [invalid]="isInvalid('lastName')"
            [errorMessage]="errorFor('lastName')"
          >
            <input
              class="input"
              [id]="ids.lastName"
              type="text"
              formControlName="lastName"
              autocomplete="family-name"
              [attr.aria-invalid]="isInvalid('lastName') || null"
              [attr.aria-describedby]="describedBy('lastName')"
            />
          </at-form-field>

          <at-form-field
            label="Identificación"
            [controlId]="ids.identification"
            [required]="true"
            [invalid]="isInvalid('identification')"
            [errorMessage]="errorFor('identification')"
          >
            <input
              class="input"
              [id]="ids.identification"
              type="text"
              formControlName="identification"
              [attr.aria-invalid]="isInvalid('identification') || null"
              [attr.aria-describedby]="describedBy('identification')"
            />
          </at-form-field>

          <button
            class="btn btn--primary"
            type="submit"
            [disabled]="loading()"
          >
            @if (loading()) {
              Enviando…
            } @else {
              Registrarme
            }
          </button>
        </form>

        <p class="reg-wrap__link">
          ¿Ya tenés cuenta?
          <a routerLink="/auth/login">Iniciar sesión</a>
        </p>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: var(--at-bg);
    }
    .reg-wrap {
      width: 100%;
      max-width: 480px;
      padding: var(--at-s4);
    }
    .reg-wrap__inner {
      background: var(--at-surface);
      border: 1px solid var(--at-border);
      padding: var(--at-s6);
    }
    .reg-wrap__title {
      font-size: var(--at-fs-3xl);
      font-weight: 800;
      letter-spacing: var(--at-tracking-tight);
      margin-bottom: var(--at-s2);
      color: var(--at-text);
    }
    .reg-wrap__subtitle {
      font-size: var(--at-fs-sm);
      color: var(--at-text-muted);
      margin-bottom: var(--at-s4);
    }
    .reg-wrap__subtitle a {
      color: var(--at-mercury);
      text-decoration: underline;
    }
    .reg-form {
      display: flex;
      flex-direction: column;
      gap: var(--at-s3);
    }
    .reg-wrap__link {
      margin-top: var(--at-s3);
      font-size: var(--at-fs-sm);
      color: var(--at-text-muted);
    }
    .reg-wrap__link a {
      color: var(--at-mercury);
      text-decoration: underline;
    }
  `,
})
export class RegisterPage {
  private readonly authApi = inject(AuthApiService);
  private readonly problemMapper = inject(ProblemErrorMapper);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  /** Exposed as a readonly constant so specs can reference it via import. */
  readonly ids = REGISTER_CONTROL_IDS;

  protected readonly loading = signal(false);
  protected readonly globalErrors = signal<readonly ErrorSummaryItem[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    firstName: ['', [Validators.required, Validators.maxLength(75)]],
    lastName: ['', [Validators.required, Validators.maxLength(75)]],
    identification: ['', [Validators.required, Validators.maxLength(20)]],
  });

  private readonly errorSummaryEl = viewChild<ElementRef<HTMLElement>>('errorSummaryEl');

  private readonly controlIdMap: Readonly<Record<string, string>> = {
    username: REGISTER_CONTROL_IDS.username,
    email: REGISTER_CONTROL_IDS.email,
    password: REGISTER_CONTROL_IDS.password,
    firstName: REGISTER_CONTROL_IDS.firstName,
    lastName: REGISTER_CONTROL_IDS.lastName,
    identification: REGISTER_CONTROL_IDS.identification,
  };

  /** Returns the first active error message for a control, or null. */
  protected errorFor(controlName: keyof typeof REGISTER_CONTROL_IDS): string | null {
    const control = this.form.controls[controlName];
    if (!control.touched || !control.errors) return null;
    const [firstKey, firstValue] = Object.entries(control.errors)[0];
    return messageFor(firstKey, firstValue);
  }

  /** Returns true when the control is invalid AND touched. */
  protected isInvalid(controlName: keyof typeof REGISTER_CONTROL_IDS): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && control.touched;
  }

  /**
   * Returns a space-separated `aria-describedby` string for a control.
   * References the `at-form-field` error element when the control is invalid + touched,
   * and the hint element when a hint exists (none defined in this form).
   */
  protected describedBy(controlName: keyof typeof REGISTER_CONTROL_IDS): string | null {
    const controlId = this.ids[controlName];
    return this.isInvalid(controlName) ? `${controlId}-error` : null;
  }

  protected focusSummaryTarget(item: ErrorSummaryItem): void {
    if (item.controlId) {
      const el = document.getElementById(item.controlId);
      el?.focus();
    }
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Focus error summary if there are field errors to surface
      const summaryEl = this.errorSummaryEl();
      if (summaryEl) {
        summaryEl.nativeElement.focus?.();
      }
      return;
    }

    clearServerErrors(this.form);
    this.globalErrors.set([]);
    this.loading.set(true);

    const v = this.form.getRawValue();
    const body: RegisterRequest = {
      username: v.username,
      email: v.email,
      password: v.password,
      firstName: v.firstName,
      lastName: v.lastName,
      identification: v.identification,
    };

    this.authApi
      .register(body)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const problem = this.problemMapper.fromHttpError(err);
          clearServerErrors(this.form);
          const { remainingGlobal } = applyProblemToForm(problem, this.form, this.controlIdMap);
          this.globalErrors.set(remainingGlobal);
          return EMPTY;
        }),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        // REQ-NO-AUTO-LOGIN: redirect to login without creating any session
        void this.router.navigate(['/auth/login'], {
          queryParams: { registered: '1' },
          replaceUrl: true,
        });
      });
  }
}
