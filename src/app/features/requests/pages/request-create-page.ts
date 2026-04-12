import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, EMPTY, finalize, forkJoin, map } from 'rxjs';

import { AuthSessionStore } from '@core/auth/auth-session.store';
import { ProblemErrorMapper } from '@core/http/problem-error.mapper';

import { AiApiService } from '../data-access/ai-api.service';
import { CatalogApiService } from '../data-access/catalog-api.service';
import { RequestsApiService } from '../data-access/requests-api.service';
import type { AiClassificationResponse } from '../models/ai-api.types';
import type {
  CreateRequestBody,
  OriginChannelResponse,
  RequestTypeResponse,
} from '../models/request-api.types';

/** Mensaje estándar cuando la IA devuelve 503. */
const AI_UNAVAILABLE_MSG =
  'La asistencia de IA no está disponible en este entorno.';

@Component({
  selector: 'at-request-create-page',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
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

        <!-- Asistente de IA: solo STAFF (contrato: POST /ai/suggest-classification → STAFF only) -->
        @if (canSuggestAiRole()) {
        <section aria-labelledby="ai-suggest-heading">
          <h3 id="ai-suggest-heading">Sugerencia de IA (opcional)</h3>
          <p>
            <small>
              Si escribiste al menos 10 caracteres en la descripción, la IA puede
              sugerir un tipo y prioridad. No reemplaza tu selección manual.
            </small>
          </p>
          <button
            type="button"
            [disabled]="!canSuggestAi()"
            (click)="suggestClassification()"
            aria-label="Obtener sugerencia de clasificación de IA"
          >
            @if (aiLoading()) {
              Consultando IA…
            } @else {
              Sugerir con IA
            }
          </button>

          @if (aiError()) {
            <p role="status">{{ aiError() }}</p>
          }

          @if (aiSuggestion()) {
            @let s = aiSuggestion()!;
            <div role="region" aria-label="Resultado de sugerencia IA">
              <dl>
                <dt>Tipo sugerido</dt>
                <dd>{{ s.suggestedRequestType ?? '—' }}</dd>
                <dt>Prioridad sugerida</dt>
                <dd>{{ s.suggestedPriority ?? '—' }}</dd>
                @if (s.confidence !== undefined) {
                  <dt>Confianza</dt>
                  <dd>{{ s.confidence * 100 | number: '1.0-0' }}%</dd>
                }
                @if (s.reasoning) {
                  <dt>Razonamiento</dt>
                  <dd>{{ s.reasoning }}</dd>
                }
              </dl>
              @if (canApplyAiSuggestion()) {
                <button type="button" (click)="applyAiSuggestion()">
                  Aplicar tipo sugerido al formulario
                </button>
              }
            </div>
          }
        </section>
        }<!-- fin @if (canSuggestAiRole()) -->

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
  private readonly aiApi = inject(AiApiService);
  private readonly problemMapper = inject(ProblemErrorMapper);
  private readonly session = inject(AuthSessionStore);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  /** POST /ai/suggest-classification → STAFF only (contrato OpenAPI). */
  protected readonly canSuggestAiRole = computed(
    () => this.session.role() === 'STAFF',
  );

  protected readonly requestTypes = signal<RequestTypeResponse[]>([]);
  protected readonly originChannels = signal<OriginChannelResponse[]>([]);
  protected readonly catalogError = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected readonly aiLoading = signal(false);
  protected readonly aiError = signal<string | null>(null);
  protected readonly aiSuggestion = signal<AiClassificationResponse | null>(null);

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

  /** Longitud reactiva del campo descripción — determina si habilitar "Sugerir con IA". */
  private readonly descriptionLength = toSignal(
    this.form.controls.description.valueChanges.pipe(map((v) => v.length)),
    { initialValue: 0 },
  );

  /** El botón de IA se habilita cuando hay >= 10 chars y no hay una consulta en curso. */
  protected readonly canSuggestAi = computed(
    () => this.descriptionLength() >= 10 && !this.aiLoading(),
  );

  /**
   * Se puede aplicar la sugerencia si el `suggestedRequestTypeId` existe en el catálogo.
   * Protege contra IDs que el backend devuelve pero ya no están en el catálogo activo.
   */
  protected readonly canApplyAiSuggestion = computed(() => {
    const s = this.aiSuggestion();
    if (s?.suggestedRequestTypeId === null || s?.suggestedRequestTypeId === undefined) {
      return false;
    }
    return this.requestTypes().some((t) => t.id === s.suggestedRequestTypeId);
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

  protected suggestClassification(): void {
    const description = this.form.controls.description.value;
    if (description.length < 10) {
      return;
    }
    this.aiError.set(null);
    this.aiSuggestion.set(null);
    this.aiLoading.set(true);

    this.aiApi
      .suggestClassification({ description })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          this.aiError.set(
            err.status === 503
              ? AI_UNAVAILABLE_MSG
              : (this.problemMapper.fromHttpError(err)?.detail ??
                  this.problemMapper.fromHttpError(err)?.title ??
                  'No se pudo obtener la sugerencia de IA.'),
          );
          return EMPTY;
        }),
        finalize(() => this.aiLoading.set(false)),
      )
      .subscribe((suggestion) => {
        this.aiSuggestion.set(suggestion);
      });
  }

  /** Aplica el `suggestedRequestTypeId` al formulario si es válido y existe en el catálogo. */
  protected applyAiSuggestion(): void {
    const id = this.aiSuggestion()?.suggestedRequestTypeId;
    if (id === null || id === undefined) {
      return;
    }
    const exists = this.requestTypes().some((t) => t.id === id);
    if (exists) {
      this.form.controls.requestTypeId.setValue(id);
    }
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
