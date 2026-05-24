import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, EMPTY, finalize } from 'rxjs';

import { AuthSessionStore } from '@core/auth/auth-session.store';
import { ProblemErrorMapper } from '@core/http/problem-error.mapper';
import { parseSafeReturnUrl } from '@core/http/return-url';
import { ErrorSummary } from '@shared/ui/error-summary/error-summary';
import { FormField } from '@shared/ui/form-field/form-field';
import { PasswordField } from '@shared/ui/password-field/password-field';
import type { ErrorSummaryItem } from '@shared/utils/problem-field-mapper';

import { messageFor } from '../../shared/i18n/validation-messages';
import { AuthApiService } from './auth-api.service';

/**
 * Stable control IDs — used by `<at-form-field>` and for aria wiring.
 */
const LOGIN_CONTROL_IDS = {
  identifier: 'login-identifier',
  password: 'login-password',
} as const;

@Component({
  selector: 'at-login-page',
  imports: [ReactiveFormsModule, RouterLink, FormField, PasswordField, ErrorSummary],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="login-wrap">
      <div class="login-wrap__form">
        <h1 class="login-wrap__title">Iniciar sesión</h1>
        @if (registeredNotice()) {
          <p class="login-wrap__notice" role="status">
            Registro completado. Iniciá sesión con tu cuenta.
          </p>
        }

        <at-error-summary
          [items]="globalErrors()"
          (focusFirst)="focusSummaryTarget($event)"
        />

        <form class="login-form" [formGroup]="form" (ngSubmit)="submit()">

          <at-form-field
            label="Usuario o correo"
            [controlId]="ids.identifier"
            [required]="true"
            [invalid]="isInvalid('identifier')"
            [errorMessage]="errorFor('identifier')"
          >
            <input
              class="input"
              [id]="ids.identifier"
              type="text"
              formControlName="identifier"
              autocomplete="username"
              placeholder="nombre de usuario o correo electrónico"
              [attr.aria-invalid]="isInvalid('identifier') || null"
              [attr.aria-describedby]="describedBy('identifier')"
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
              autocomplete="current-password"
              formControlName="password"
              [ariaDescribedBy]="describedBy('password')"
              [ariaInvalid]="isInvalid('password')"
            />
          </at-form-field>

          <button class="btn btn--primary" type="submit" [disabled]="loading()">
            @if (loading()) {
              Entrando…
            } @else {
              Entrar
            }
          </button>
        </form>
        <p class="login-wrap__link">
          <a routerLink="/auth/register">Crear cuenta</a>
        </p>
      </div>
      <aside class="login-wrap__deco" aria-hidden="true">
        <div class="deco__brand">
          <span class="deco__brand-mark">[ AT ]</span>
          <span class="deco__brand-name">Academic Triage</span>
          <span class="deco__brand-sub">Plataforma de gestión académica</span>
        </div>

        <ul class="deco__list">
          <li class="deco__item">
            <span class="deco__bullet">▸</span>
            <div>
              <p class="deco__item-title">Registro &amp; clasificación</p>
              <p class="deco__item-text">Recepción y categorización de solicitudes.</p>
            </div>
          </li>
          <li class="deco__item">
            <span class="deco__bullet">▸</span>
            <div>
              <p class="deco__item-title">Gestión de solicitudes</p>
              <p class="deco__item-text">Asignación, atención y cierre con trazabilidad.</p>
            </div>
          </li>
          <li class="deco__item">
            <span class="deco__bullet">▸</span>
            <div>
              <p class="deco__item-title">Resolución colaborativa</p>
              <p class="deco__item-text">Reglas de negocio y priorización asistida.</p>
            </div>
          </li>
        </ul>

        <p class="deco__footer">
          <span class="deco__dot"></span>
          Universidad del Quindío · v1.0
        </p>
      </aside>
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
    .login-wrap {
      display: grid;
      grid-template-columns: 40fr 60fr;
      max-width: 900px;
      width: 100%;
      border: 1px solid var(--at-border);
    }
    .login-wrap__form {
      padding: var(--at-s6);
      background: var(--at-surface);
    }
    .login-wrap__title {
      font-size: var(--at-fs-3xl);
      font-weight: 800;
      letter-spacing: var(--at-tracking-tight);
      margin-bottom: var(--at-s4);
      color: var(--at-text);
    }
    .login-wrap__notice {
      font-size: var(--at-fs-sm);
      color: var(--at-success);
      margin-bottom: var(--at-s3);
      padding: var(--at-s2);
      border: 1px solid var(--at-success);
      background: var(--at-ok-bg);
    }
    .login-form {
      display: flex;
      flex-direction: column;
      gap: var(--at-s3);
    }
    .login-wrap__link {
      margin-top: var(--at-s3);
      font-size: var(--at-fs-sm);
      color: var(--at-text-muted);
    }
    .login-wrap__link a {
      color: var(--at-mercury);
      text-decoration: underline;
    }
    .login-wrap__deco {
      background: var(--at-surface-2);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: var(--at-s6);
      padding: var(--at-s8) var(--at-s6);
      border-left: 1px solid var(--at-border);
    }
    .deco__brand {
      display: flex;
      flex-direction: column;
      gap: var(--at-s2);
    }
    .deco__brand-mark {
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-sm);
      letter-spacing: var(--at-tracking-wide);
      color: var(--at-mercury);
    }
    .deco__brand-name {
      font-size: var(--at-fs-2xl);
      font-weight: 800;
      letter-spacing: var(--at-tracking-tight);
      color: var(--at-text);
      line-height: 1.1;
    }
    .deco__brand-sub {
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      letter-spacing: var(--at-tracking-wide);
      text-transform: uppercase;
      color: var(--at-text-muted);
    }
    .deco__list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: var(--at-s4);
      border-top: 1px solid var(--at-border);
      padding-top: var(--at-s5);
    }
    .deco__item {
      display: flex;
      gap: var(--at-s3);
      align-items: flex-start;
    }
    .deco__bullet {
      color: var(--at-mercury);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs);
      line-height: 1.2;
      padding-top: 2px;
    }
    .deco__item-title {
      margin: 0 0 var(--at-s1);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-sm);
      font-weight: 700;
      letter-spacing: var(--at-tracking-wide);
      text-transform: uppercase;
      color: var(--at-text);
    }
    .deco__item-text {
      margin: 0;
      font-size: var(--at-fs-sm);
      color: var(--at-text-muted);
      line-height: 1.5;
    }
    .deco__footer {
      margin: 0;
      display: inline-flex;
      align-items: center;
      gap: var(--at-s2);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      letter-spacing: var(--at-tracking-wide);
      text-transform: uppercase;
      color: var(--at-text-dim);
    }
    .deco__dot {
      width: 6px;
      height: 6px;
      background: var(--at-success);
      border-radius: 50%;
      box-shadow: 0 0 6px var(--at-success);
    }
    @media (max-width: 640px) {
      .login-wrap {
        grid-template-columns: 1fr;
      }
      .login-wrap__deco {
        display: none;
      }
    }
  `,
})
export class LoginPage {
  private readonly authApi = inject(AuthApiService);
  private readonly session = inject(AuthSessionStore);
  private readonly problemMapper = inject(ProblemErrorMapper);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly ids = LOGIN_CONTROL_IDS;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly globalErrors = signal<readonly ErrorSummaryItem[]>([]);
  protected readonly registeredNotice = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    identifier: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor() {
    const registered = this.route.snapshot.queryParamMap.get('registered');
    this.registeredNotice.set(registered === '1');
  }

  /** Returns the first active error message for a control, or null. */
  protected errorFor(controlName: keyof typeof LOGIN_CONTROL_IDS): string | null {
    const control = this.form.controls[controlName];
    if (!control.touched || !control.errors) return null;
    const [firstKey, firstValue] = Object.entries(control.errors)[0];
    return messageFor(firstKey, firstValue);
  }

  /** Returns true when the control is invalid AND touched. */
  protected isInvalid(controlName: keyof typeof LOGIN_CONTROL_IDS): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && control.touched;
  }

  protected describedBy(controlName: keyof typeof LOGIN_CONTROL_IDS): string | null {
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
      return;
    }
    this.globalErrors.set([]);
    this.errorMessage.set(null);
    this.loading.set(true);
    const body = this.form.getRawValue();
    this.authApi
      .login(body)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const problem = this.problemMapper.fromHttpError(err);
          const msg = problem?.detail ?? problem?.title ?? 'No se pudo iniciar sesión.';
          this.errorMessage.set(msg);
          this.globalErrors.set([{ field: null, message: msg }]);
          return EMPTY;
        }),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((auth) => {
        const token = auth.token;
        const user = auth.user;
        if (typeof token !== 'string' || token === '' || user === undefined) {
          this.errorMessage.set('Respuesta de login incompleta.');
          this.globalErrors.set([{ field: null, message: 'Respuesta de login incompleta.' }]);
          return;
        }
        this.session.setSession(token, user);
        const rawReturn = this.route.snapshot.queryParamMap.get('returnUrl');
        const safeUrl = parseSafeReturnUrl(rawReturn);
        void this.router.navigateByUrl(safeUrl);
      });
  }
}
