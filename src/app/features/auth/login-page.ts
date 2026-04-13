import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, EMPTY, finalize } from 'rxjs';

import { AuthSessionStore } from '@core/auth/auth-session.store';
import { ProblemErrorMapper } from '@core/http/problem-error.mapper';

import { AuthApiService } from './auth-api.service';

@Component({
  selector: 'at-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h2>Iniciar sesión</h2>
      @if (registeredNotice()) {
        <p role="status">Registro completado. Iniciá sesión con tu cuenta.</p>
      }
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div>
          <label for="login-identifier">Usuario o correo</label>
          <input
            id="login-identifier"
            type="text"
            formControlName="identifier"
            autocomplete="username"
            placeholder="nombre de usuario o correo electrónico"
          />
        </div>
        <div>
          <label for="login-password">Contraseña</label>
          <input
            id="login-password"
            type="password"
            formControlName="password"
            autocomplete="current-password"
          />
        </div>
        @if (errorMessage()) {
          <p role="alert">{{ errorMessage() }}</p>
        }
        <button type="submit" [disabled]="form.invalid || loading()">
          @if (loading()) {
            Entrando…
          } @else {
            Entrar
          }
        </button>
      </form>
      <p>
        <a routerLink="/auth/register">Crear cuenta</a>
      </p>
    </section>
  `,
})
export class LoginPage {
  private readonly authApi = inject(AuthApiService);
  private readonly session = inject(AuthSessionStore);
  private readonly problemMapper = inject(ProblemErrorMapper);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly registeredNotice = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    identifier: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(255),
      ],
    ],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor() {
    const registered = this.route.snapshot.queryParamMap.get('registered');
    this.registeredNotice.set(registered === '1');
  }

  protected submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.errorMessage.set(null);
    this.loading.set(true);
    const body = this.form.getRawValue();
    this.authApi
      .login(body)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const problem = this.problemMapper.fromHttpError(err);
          const msg =
            problem?.detail ??
            problem?.title ??
            'No se pudo iniciar sesión.';
          this.errorMessage.set(msg);
          return EMPTY;
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((auth) => {
        const token = auth.token;
        const user = auth.user;
        if (typeof token !== 'string' || token === '' || user === undefined) {
          this.errorMessage.set('Respuesta de login incompleta.');
          return;
        }
        this.session.setSession(token, user);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (
          returnUrl !== null &&
          returnUrl.startsWith('/') &&
          !returnUrl.startsWith('//')
        ) {
          void this.router.navigateByUrl(returnUrl);
        } else {
          void this.router.navigate(['/app']);
        }
      });
  }
}
