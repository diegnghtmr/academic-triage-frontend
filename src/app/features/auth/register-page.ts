import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, EMPTY, finalize } from 'rxjs';

import type { RegisterRequest } from '@core/auth/models/auth-api.types';
import { ProblemErrorMapper } from '@core/http/problem-error.mapper';

import { AuthApiService } from './auth-api.service';

/**
 * Registro público (`POST /auth/register`).
 * Política conservadora: el contrato devuelve `UserResponse` (201), no garantiza JWT;
 * no se hace auto-login; tras éxito se redirige al login.
 */
@Component({
  selector: 'at-register-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h2>Registro</h2>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div>
          <label for="reg-username">Usuario</label>
          <input id="reg-username" type="text" formControlName="username" autocomplete="username" />
        </div>
        <div>
          <label for="reg-email">Correo</label>
          <input id="reg-email" type="email" formControlName="email" autocomplete="email" />
        </div>
        <div>
          <label for="reg-password">Contraseña</label>
          <input
            id="reg-password"
            type="password"
            formControlName="password"
            autocomplete="new-password"
          />
        </div>
        <div>
          <label for="reg-first">Nombre</label>
          <input id="reg-first" type="text" formControlName="firstName" autocomplete="given-name" />
        </div>
        <div>
          <label for="reg-last">Apellido</label>
          <input id="reg-last" type="text" formControlName="lastName" autocomplete="family-name" />
        </div>
        <div>
          <label for="reg-id">Identificación</label>
          <input id="reg-id" type="text" formControlName="identification" />
        </div>
        @if (errorMessage()) {
          <p role="alert">{{ errorMessage() }}</p>
        }
        <button type="submit" [disabled]="form.invalid || loading()">
          @if (loading()) {
            Enviando…
          } @else {
            Registrarme
          }
        </button>
      </form>
      <p><a routerLink="/auth/login">Volver al inicio de sesión</a></p>
    </section>
  `,
})
export class RegisterPage {
  private readonly authApi = inject(AuthApiService);
  private readonly problemMapper = inject(ProblemErrorMapper);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

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
      )
      .subscribe(() => {
        void this.router.navigate(['/auth/login'], {
          queryParams: { registered: '1' },
          replaceUrl: true,
        });
      });
  }
}
