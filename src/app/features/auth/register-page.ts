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
import { Router, RouterLink } from '@angular/router';
import { catchError, EMPTY, finalize } from 'rxjs';

import type { RegisterRequest } from '@core/auth/models/auth-api.types';
import { ProblemErrorMapper } from '@core/http/problem-error.mapper';

import { AuthApiService } from './auth-api.service';

/**
 * Public registration (`POST /auth/register`).
 * Conservative policy: the contract returns `UserResponse` (201) and does not guarantee a JWT;
 * no auto-login is performed; on success the user is redirected to the login page.
 */
@Component({
  selector: 'at-register-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="reg-wrap">
      <div class="reg-wrap__inner">
        <h1 class="reg-wrap__title">Registro</h1>
        <form class="reg-form" [formGroup]="form" (ngSubmit)="submit()">
          <div class="field">
            <label class="field__label" for="reg-username">Usuario</label>
            <input class="input" id="reg-username" type="text" formControlName="username" autocomplete="username" />
          </div>
          <div class="field">
            <label class="field__label" for="reg-email">Correo</label>
            <input class="input" id="reg-email" type="email" formControlName="email" autocomplete="email" />
          </div>
          <div class="field">
            <label class="field__label" for="reg-password">Contraseña</label>
            <input
              class="input"
              id="reg-password"
              type="password"
              formControlName="password"
              autocomplete="new-password"
            />
          </div>
          <div class="field">
            <label class="field__label" for="reg-first">Nombre</label>
            <input class="input" id="reg-first" type="text" formControlName="firstName" autocomplete="given-name" />
          </div>
          <div class="field">
            <label class="field__label" for="reg-last">Apellido</label>
            <input class="input" id="reg-last" type="text" formControlName="lastName" autocomplete="family-name" />
          </div>
          <div class="field">
            <label class="field__label" for="reg-id">Identificación</label>
            <input class="input" id="reg-id" type="text" formControlName="identification" />
          </div>
          @if (errorMessage()) {
            <p class="field__error" role="alert">{{ errorMessage() }}</p>
          }
          <button class="btn btn--primary" type="submit" [disabled]="form.invalid || loading()">
            @if (loading()) {
              Enviando…
            } @else {
              Registrarme
            }
          </button>
        </form>
        <p class="reg-wrap__link"><a routerLink="/auth/login">Volver al inicio de sesión</a></p>
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
      margin-bottom: var(--at-s4);
      color: var(--at-text);
    }
    .reg-form {
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

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),
      ],
    ],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    firstName: ['', [Validators.required, Validators.maxLength(75)]],
    lastName: ['', [Validators.required, Validators.maxLength(75)]],
    identification: ['', [Validators.required, Validators.maxLength(20)]],
  });

  protected submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.errorMessage.set(null);
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
          const msg =
            problem?.detail ??
            problem?.title ??
            'No se pudo completar el registro.';
          this.errorMessage.set(msg);
          return EMPTY;
        }),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        void this.router.navigate(['/auth/login'], {
          queryParams: { registered: '1' },
          replaceUrl: true,
        });
      });
  }
}
