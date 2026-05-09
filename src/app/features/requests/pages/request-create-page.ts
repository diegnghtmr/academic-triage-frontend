import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
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
import { WEB_CHANNEL_NAME } from '@shared/models/origin-channel';

/** Standard message when the AI returns 503. */
const AI_UNAVAILABLE_MSG = 'La asistencia de IA no está disponible en este entorno.';

@Component({
  selector: 'at-request-create-page',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="form-page">
      <header class="form-page__head">
        <a class="form-page__back" routerLink="/app/requests/list" aria-label="Volver al listado">
          <span aria-hidden="true">←</span> Listado
        </a>
        <h2 class="form-page__title">Nueva solicitud</h2>
      </header>

      @if (catalogError()) {
        <p class="field__error" role="alert">{{ catalogError() }}</p>
      }

      <div class="card">
        <form class="create-form" [formGroup]="form" (ngSubmit)="submit()">
          <div class="field">
            <label class="field__label" for="crt-type">
              Tipo de solicitud <span class="field__req" aria-hidden="true">*</span>
            </label>
            <select class="input" id="crt-type" formControlName="requestTypeId">
              <option [ngValue]="null">Seleccionar…</option>
              @for (t of requestTypesWithId(); track t.id) {
                <option [ngValue]="t.id">{{ t.name }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label class="field__label" for="crt-ch">
              Canal de origen <span class="field__req" aria-hidden="true">*</span>
            </label>
            @if (isStudent()) {
              @let fixedChannel = selectedOriginChannel();
              <input
                class="input"
                id="crt-ch"
                type="text"
                [value]="fixedChannel?.name ?? 'Sistema web'"
                readonly
                aria-readonly="true"
              />
              <small class="field__hint">Este canal se asigna automáticamente para estudiantes.</small>
            } @else {
              <select class="input" id="crt-ch" formControlName="originChannelId">
                <option [ngValue]="null">Seleccionar…</option>
                @for (c of originChannelsWithId(); track c.id) {
                  <option [ngValue]="c.id">{{ c.name }}</option>
                }
              </select>
            }
          </div>
          <div class="field">
            <label class="field__label" for="crt-desc">
              Descripción <span class="field__req" aria-hidden="true">*</span>
            </label>
            <textarea class="input" id="crt-desc" rows="6" formControlName="description"></textarea>
          </div>

          <!-- AI assistant: STAFF only (contract: POST /ai/suggest-classification → STAFF only) -->
          @if (canSuggestAiRole()) {
            <section class="ai-section" aria-labelledby="ai-suggest-heading">
              <h3 id="ai-suggest-heading" class="ai-section__title">Ayuda de IA (opcional)</h3>
              <p class="ai-section__hint">
                <small>
                  Cuando la descripción tiene suficiente detalle, la IA puede orientarte con un tipo
                  de solicitud y una prioridad sugerida. Después puedes ajustarlo manualmente.
                </small>
              </p>
              <button
                class="btn btn--sm"
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
                <p class="field__error" role="status">{{ aiError() }}</p>
              }

              @if (aiSuggestion()) {
                @let s = aiSuggestion()!;
                <div class="ai-result" role="region" aria-label="Resultado de sugerencia IA">
                  <dl class="ai-result__dl">
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
                    <button class="btn btn--sm" type="button" (click)="applyAiSuggestion()">
                      Usar este tipo en el formulario
                    </button>
                  }
                </div>
              }
            </section>
          }
          <div class="field">
            <label class="field__label" for="crt-deadline">
              Fecha límite <small>(opcional)</small>
            </label>
            <input class="input" id="crt-deadline" type="date" formControlName="deadline" />
          </div>
          @if (errorMessage()) {
            <p class="field__error" role="alert">{{ errorMessage() }}</p>
          }
          <div class="form-actions">
            <a class="btn btn--ghost form-actions__btn" routerLink="/app/requests/list">
              Cancelar
            </a>
            <button
              class="btn btn--primary form-actions__btn"
              type="submit"
              [disabled]="form.invalid || submitting()"
            >
              {{ submitting() ? 'Enviando…' : 'Crear solicitud' }}
            </button>
          </div>
        </form>
      </div>
    </section>
  `,
  styles: `
    .form-page {
      padding: var(--at-s6);
      max-width: 680px;
      margin: 0 auto;
    }
    .form-page__head {
      display: flex;
      flex-direction: column;
      gap: var(--at-s2);
      margin-bottom: var(--at-s5);
    }
    .form-page__back {
      align-self: flex-start;
      display: inline-flex;
      align-items: center;
      gap: var(--at-s1);
      padding: var(--at-s1) var(--at-s2);
      color: var(--at-text-muted);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      letter-spacing: var(--at-tracking-wide);
      text-transform: uppercase;
      text-decoration: none;
      transition: color var(--at-dur-fast) var(--at-ease);
    }
    .form-page__back:hover {
      color: var(--at-mercury);
    }
    .form-page__title {
      font-size: var(--at-fs-xl);
      font-weight: 800;
      letter-spacing: var(--at-tracking-tight);
      margin: 0;
    }
    .card {
      background: var(--at-surface);
      border: 1px solid var(--at-border);
      padding: var(--at-s6);
    }
    .create-form {
      display: flex;
      flex-direction: column;
      gap: var(--at-s4);
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: var(--at-s2);
    }
    .field__label {
      font-size: var(--at-fs-xs);
      color: var(--at-text-muted);
      font-family: var(--at-font-mono);
      letter-spacing: var(--at-tracking-wide);
      text-transform: uppercase;
    }
    .field__label small {
      text-transform: none;
      letter-spacing: 0;
      margin-left: var(--at-s2);
      color: var(--at-text-dim);
    }
    .field__req {
      color: var(--at-danger);
    }
    .field__hint {
      font-size: var(--at-fs-xs);
      color: var(--at-text-muted);
      margin-top: var(--at-s1);
    }
    .field__error {
      font-size: var(--at-fs-sm);
      color: var(--at-danger);
      padding: var(--at-s1) var(--at-s2);
      background: var(--at-err-bg);
    }

    .ai-section {
      background: var(--at-surface-2);
      border: 1px solid var(--at-border);
      border-left: 2px solid var(--at-mercury);
      padding: var(--at-s4);
      display: flex;
      flex-direction: column;
      gap: var(--at-s3);
    }
    .ai-section__title {
      margin: 0;
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      font-weight: 800;
      letter-spacing: var(--at-tracking-wide);
      text-transform: uppercase;
      color: var(--at-mercury);
    }
    .ai-section__hint {
      margin: 0;
      font-size: var(--at-fs-sm);
      color: var(--at-text-muted);
      line-height: 1.5;
    }
    .ai-result {
      background: var(--at-surface);
      border: 1px solid var(--at-border);
      padding: var(--at-s3) var(--at-s4);
      font-size: var(--at-fs-sm);
    }
    .ai-result__dl {
      display: grid;
      grid-template-columns: 9rem 1fr;
      gap: var(--at-s2);
      margin: 0 0 var(--at-s3);
    }
    .ai-result__dl dt {
      color: var(--at-text-muted);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      letter-spacing: var(--at-tracking-wide);
      text-transform: uppercase;
    }
    .ai-result__dl dd {
      margin: 0;
      color: var(--at-text);
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--at-s2);
      margin-top: var(--at-s2);
      padding-top: var(--at-s4);
      border-top: 1px solid var(--at-border);
    }
    .form-actions__btn {
      min-width: 8rem;
      justify-content: center;
    }
    @media (max-width: 480px) {
      .form-actions { flex-direction: column-reverse; }
      .form-actions__btn { width: 100%; }
    }
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
  private readonly destroyRef = inject(DestroyRef);

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

  protected readonly form = this.fb.nonNullable.group({
    requestTypeId: this.fb.control<number | null>(null, Validators.required),
    originChannelId: this.fb.control<number | null>(null, Validators.required),
    description: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.minLength(10),
      Validators.maxLength(2000),
    ]),
    deadline: this.fb.nonNullable.control(''),
  });

  protected readonly requestTypesWithId = computed(() =>
    this.requestTypes().filter(
      (t): t is RequestTypeResponse & { id: number } => typeof t.id === 'number',
    ),
  );

  protected readonly originChannelsWithId = computed(() =>
    this.originChannels().filter(
      (c): c is OriginChannelResponse & { id: number } => typeof c.id === 'number',
    ),
  );

  protected readonly selectedOriginChannel = computed(() => {
    const channelId = this.form.controls.originChannelId.value;
    if (channelId === null) {
      return null;
    }
    return this.originChannels().find((channel) => channel.id === channelId) ?? null;
  });

  /** Reactive length of the description field — determines whether to enable "Suggest with AI". */
  private readonly descriptionLength = toSignal(
    this.form.controls.description.valueChanges.pipe(map((v) => v.length)),
    { initialValue: 0 },
  );

  /** The AI button is enabled when there are >= 10 chars and no request is in flight. */
  protected readonly canSuggestAi = computed(
    () => this.descriptionLength() >= 10 && !this.aiLoading(),
  );

  /**
   * The suggestion can be applied if `suggestedRequestTypeId` exists in the catalogue.
   * Guards against IDs returned by the backend that are no longer in the active catalogue.
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
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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
      (channel) => (channel.name?.trim().toLowerCase() ?? '') === WEB_CHANNEL_NAME,
    )?.id;
    if (typeof webChannelId === 'number') {
      this.form.controls.originChannelId.setValue(webChannelId);
    }
    // No fallback. If no match, control stays null; Validators.required surfaces the error.
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
          if (err.status === 503) {
            this.aiError.set(AI_UNAVAILABLE_MSG);
          } else {
            const p = this.problemMapper.fromHttpError(err);
            this.aiError.set(
              p?.detail ?? p?.title ?? 'No pudimos pedirle ayuda a la IA en este momento.',
            );
          }
          return EMPTY;
        }),
        finalize(() => this.aiLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((suggestion) => {
        this.aiSuggestion.set(suggestion);
      });
  }

  /** Applies the `suggestedRequestTypeId` to the form if it is valid and exists in the catalogue. */
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
        takeUntilDestroyed(this.destroyRef),
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
