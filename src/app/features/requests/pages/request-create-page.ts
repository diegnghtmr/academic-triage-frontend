import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
const AI_UNAVAILABLE_MSG = 'La asistencia de IA no está disponible en este entorno.';

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
          @if (isStudent()) {
            @let fixedChannel = selectedOriginChannel();
            <input
              id="crt-ch"
              type="text"
              [value]="fixedChannel?.name ?? 'Sistema web'"
              readonly
              aria-readonly="true"
            />
            <small>Este canal se asigna automáticamente para estudiantes.</small>
          } @else {
            <select id="crt-ch" formControlName="originChannelId">
              <option [ngValue]="null">Seleccionar…</option>
              @for (c of originChannels(); track c.id) {
                <option [ngValue]="c.id">{{ c.name }}</option>
              }
            </select>
          }
        </div>
        <div>
          <label for="crt-desc">Descripción</label>
          <textarea id="crt-desc" rows="6" formControlName="description"></textarea>
        </div>

        <!-- Asistente de IA: solo STAFF (contrato: POST /ai/suggest-classification → STAFF only) -->
        @if (canSuggestAiRole()) {
          <section aria-labelledby="ai-suggest-heading">
            <h3 id="ai-suggest-heading">Ayuda de IA (opcional)</h3>
            <p>
              <small>
                Cuando la descripción tiene suficiente detalle, la IA puede orientarte con un tipo
                de solicitud y una prioridad sugerida. Después puedes ajustarlo manualmente.
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
                Pedir ayuda a la IA
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
                    <dt>Motivo sugerido</dt>
                    <dd>{{ s.reasoning }}</dd>
                  }
                </dl>
                @if (canApplyAiSuggestion()) {
                  <button type="button" (click)="applyAiSuggestion()">
                    Usar este tipo en el formulario
                  </button>
                }
              </div>
            }
          </section>
        }
        <!-- fin @if (canSuggestAiRole()) -->
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
            Crear solicitud
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
  protected readonly canSuggestAiRole = computed(() => this.session.role() === 'STAFF');
  protected readonly isStudent = computed(() => this.session.role() === 'STUDENT');

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

  protected readonly selectedOriginChannel = computed(() => {
    const channelId = this.form.controls.originChannelId.value;
    if (channelId === null) {
      return null;
    }
    return this.originChannels().find((channel) => channel.id === channelId) ?? null;
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
        this.assignStudentDefaultChannel(channels);
      },
      error: (err: HttpErrorResponse) => {
        const p = this.problemMapper.fromHttpError(err);
        this.catalogError.set(
          p?.detail ??
            p?.title ??
            'No pudimos cargar los datos necesarios para crear la solicitud.',
        );
      },
    });
  }

  private assignStudentDefaultChannel(channels: OriginChannelResponse[]): void {
    if (!this.isStudent()) {
      return;
    }

    const webChannelId = channels.find(
      (channel) => (channel.name?.trim().toLowerCase() ?? '') === 'sistema web',
    )?.id;
    if (typeof webChannelId === 'number') {
      this.form.controls.originChannelId.setValue(webChannelId);
      return;
    }

    const firstAvailableChannelId = channels.find((channel) => typeof channel.id === 'number')?.id;
    if (typeof firstAvailableChannelId === 'number') {
      this.form.controls.originChannelId.setValue(firstAvailableChannelId);
    }
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
                  'No pudimos pedirle ayuda a la IA en este momento.'),
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
            p?.detail ??
              p?.title ??
              'No pudimos crear la solicitud. Inténtalo de nuevo en unos instantes.',
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
