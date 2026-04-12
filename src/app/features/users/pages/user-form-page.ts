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

import type { RoleEnum } from '@core/auth/models/auth-api.types';
import { ProblemErrorMapper } from '@core/http/problem-error.mapper';

import { UsersApiService } from '../data-access/users-api.service';
import type { UpdateUserBody } from '../models/user-admin.types';

@Component({
  selector: 'at-user-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h2>Editar usuario</h2>
      <p><a routerLink="/app/users">Volver al listado</a></p>

      @if (loadError()) {
        <p role="alert">{{ loadError() }}</p>
      } @else if (loadingItem()) {
        <p>Cargando datos del usuario…</p>
      } @else {
        @if (username()) {
          <p>
            <strong>Usuario:</strong> {{ username() }}
            <small>(no editable)</small>
          </p>
        }

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div>
            <label for="uf-firstname">Nombre <span aria-hidden="true">*</span></label>
            <input
              id="uf-firstname"
              type="text"
              formControlName="firstName"
              maxlength="75"
              autocomplete="given-name"
            />
            @if (form.controls.firstName.invalid && form.controls.firstName.touched) {
              <span role="alert">El nombre es requerido (máx. 75 caracteres).</span>
            }
          </div>

          <div>
            <label for="uf-lastname">Apellido <span aria-hidden="true">*</span></label>
            <input
              id="uf-lastname"
              type="text"
              formControlName="lastName"
              maxlength="75"
              autocomplete="family-name"
            />
            @if (form.controls.lastName.invalid && form.controls.lastName.touched) {
              <span role="alert">El apellido es requerido (máx. 75 caracteres).</span>
            }
          </div>

          <div>
            <label for="uf-id">Identificación <span aria-hidden="true">*</span></label>
            <input
              id="uf-id"
              type="text"
              formControlName="identification"
              maxlength="20"
              autocomplete="off"
            />
            @if (
              form.controls.identification.invalid &&
              form.controls.identification.touched
            ) {
              <span role="alert">La identificación es requerida (máx. 20 caracteres).</span>
            }
          </div>

          <div>
            <label for="uf-email">Email <span aria-hidden="true">*</span></label>
            <input
              id="uf-email"
              type="email"
              formControlName="email"
              autocomplete="email"
            />
            @if (form.controls.email.invalid && form.controls.email.touched) {
              <span role="alert">Ingrese un email válido.</span>
            }
          </div>

          <div>
            <label for="uf-role">Rol <span aria-hidden="true">*</span></label>
            <select id="uf-role" formControlName="role">
              @for (r of roleOptions; track r) {
                <option [value]="r">{{ r }}</option>
              }
            </select>
          </div>

          <div>
            <label>
              <input type="checkbox" formControlName="active" />
              Activo
            </label>
          </div>

          @if (submitError()) {
            <p role="alert">{{ submitError() }}</p>
          }

          <button type="submit" [disabled]="form.invalid || submitting()">
            @if (submitting()) {
              Guardando…
            } @else {
              Guardar cambios
            }
          </button>
        </form>
      }
    </section>
  `,
})
export class UserFormPage {
  private readonly api = inject(UsersApiService);
  private readonly problemMapper = inject(ProblemErrorMapper);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  protected readonly roleOptions: RoleEnum[] = ['ADMIN', 'STAFF', 'STUDENT'];

  protected readonly loadingItem = signal(true);
  protected readonly submitting = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitError = signal<string | null>(null);
  /** `username` no editable — se muestra fuera del form como referencia. */
  protected readonly username = signal<string | null>(null);

  private userId: number | null = null;

  protected readonly form = this.fb.nonNullable.group({
    firstName: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(75),
    ]),
    lastName: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(75),
    ]),
    identification: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(20),
    ]),
    email: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.email,
    ]),
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
        this.loadError.set('Identificador de usuario inválido.');
        this.loadingItem.set(false);
      }
    } else {
      this.loadError.set('No se especificó el usuario a editar.');
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
            p?.detail ?? p?.title ?? 'No se pudo cargar el usuario.',
          );
          return EMPTY;
        }),
        finalize(() => this.loadingItem.set(false)),
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
            p?.detail ?? p?.title ?? 'No se pudo guardar el usuario.',
          );
          return EMPTY;
        }),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe(() => {
        void this.router.navigate(['/app/users']);
      });
  }
}
