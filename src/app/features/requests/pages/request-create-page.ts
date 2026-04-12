import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, EMPTY, finalize, forkJoin } from 'rxjs';

import { ProblemErrorMapper } from '@core/http/problem-error.mapper';

import { CatalogApiService } from '../data-access/catalog-api.service';
import { RequestsApiService } from '../data-access/requests-api.service';
import type {
  CreateRequestBody,
  OriginChannelResponse,
  RequestTypeResponse,
} from '../models/request-api.types';

@Component({
  selector: 'at-request-create-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h2>Nueva solicitud</h2>
      <p><a routerLink="/app/requests/list">Volver al listado</a></p>
      @if (catalogError()) {
        <p role="alert">{{ catalogError() }}</p>
      }
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div>
          <label for="crt-type">Tipo de solicitud</label>
          <select id="crt-type" formControlName="requestTypeId">
            <option [ngValue]="null">Seleccionar…</option>
            @for (t of requestTypes(); track t.id) {
              <option [ngValue]="t.id">{{ t.name }}</option>
            }
          </select>
        </div>
        <div>
          <label for="crt-ch">Canal de origen</label>
          <select id="crt-ch" formControlName="originChannelId">
            <option [ngValue]="null">Seleccionar…</option>
            @for (c of originChannels(); track c.id) {
              <option [ngValue]="c.id">{{ c.name }}</option>
            }
          </select>
        </div>
        <div>
          <label for="crt-desc">Descripción</label>
          <textarea id="crt-desc" rows="6" formControlName="description"></textarea>
        </div>
        <div>
          <label for="crt-deadline">Fecha límite (opcional)</label>
          <input id="crt-deadline" type="date" formControlName="deadline" />
        </div>
        @if (errorMessage()) {
          <p role="alert">{{ errorMessage() }}</p>
        }
        <button type="submit" [disabled]="form.invalid || submitting()">
          @if (submitting()) {
            Enviando…
          } @else {
            Enviar
          }
        </button>
      </form>
    </section>
  `,
})
export class RequestCreatePage {
  private readonly catalogApi = inject(CatalogApiService);
  private readonly requestsApi = inject(RequestsApiService);
  private readonly problemMapper = inject(ProblemErrorMapper);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly requestTypes = signal<RequestTypeResponse[]>([]);
  protected readonly originChannels = signal<OriginChannelResponse[]>([]);
  protected readonly catalogError = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected readonly form = this.fb.group({
    requestTypeId: this.fb.control<number | null>(null, Validators.required),
    originChannelId: this.fb.control<number | null>(null, Validators.required),
    description: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.minLength(10),
      Validators.maxLength(2000),
    ]),
    deadline: this.fb.nonNullable.control(''),
  });

  constructor() {
    forkJoin({
      types: this.catalogApi.listRequestTypes(),
      channels: this.catalogApi.listOriginChannels(),
    }).subscribe({
      next: ({ types, channels }) => {
        this.requestTypes.set(types);
        this.originChannels.set(channels);
      },
      error: (err: HttpErrorResponse) => {
        const p = this.problemMapper.fromHttpError(err);
        this.catalogError.set(
          p?.detail ?? p?.title ?? 'No se pudieron cargar los catálogos.',
        );
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    if (v.requestTypeId === null || v.originChannelId === null) {
      return;
    }
    const body: CreateRequestBody = {
      requestTypeId: v.requestTypeId,
      originChannelId: v.originChannelId,
      description: v.description,
    };
    if (v.deadline !== '') {
      body.deadline = v.deadline;
    }
    this.errorMessage.set(null);
    this.submitting.set(true);
    this.requestsApi
      .createRequest(body)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          this.errorMessage.set(
            p?.detail ?? p?.title ?? 'No se pudo crear la solicitud.',
          );
          return EMPTY;
        }),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe((created) => {
        if (created.id !== undefined) {
          void this.router.navigate(['/app/requests', created.id]);
        } else {
          void this.router.navigate(['/app/requests/list']);
        }
      });
  }
}
