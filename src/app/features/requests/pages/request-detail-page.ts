import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, EMPTY, finalize, type Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { AuthSessionStore } from '@core/auth/auth-session.store';
import { ProblemErrorMapper } from '@core/http/problem-error.mapper';
import { DateTimeLabelPipe } from '@shared/pipes/date-time-label.pipe';
import { DisplayLabelPipe } from '@shared/pipes/display-label.pipe';
import { StateBadge } from '@shared/ui/state-badge';
import { PriorityBadge } from '@shared/ui/priority-badge';

import { adaptHistoryEntry, adaptRequestDetail } from '../adapters/request-detail.adapter';
import { AiPanel } from '../components/ai-panel';
import { Pipeline } from '../components/pipeline';
import { TerminalHistory } from '../components/terminal-history';
import { AiApiService } from '../data-access/ai-api.service';
import { CatalogApiService } from '../data-access/catalog-api.service';
import { RequestsApiService } from '../data-access/requests-api.service';
import type { AiSummaryResponse } from '../models/ai-api.types';
import type {
  PriorityEnum,
  PrioritySuggestionResponse,
  RequestResponse,
  RequestStatusEnum,
  RequestTypeResponse,
} from '../models/request-api.types';
import type { HistoryEntryView, RequestDetailView } from '../models/request-detail-view';
import {
  canShowAddHistoryNote,
  canShowAssign,
  canShowAttend,
  canShowCancel,
  canShowClassify,
  canShowClose,
  canShowPrioritize,
  canShowReject,
  isTerminalStatus,
} from '../utils/request-action-visibility';

/** Mensaje estándar cuando la IA devuelve 503. */
const AI_UNAVAILABLE_MSG = 'La asistencia de IA no está disponible en este entorno.';

@Component({
  selector: 'at-request-detail-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DisplayLabelPipe,
    DateTimeLabelPipe,
    StateBadge,
    PriorityBadge,
    Pipeline,
    TerminalHistory,
    AiPanel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section">
      <p class="section__back"><a routerLink="/app/requests/list">← Listado</a></p>

      @if (loadError()) {
        <p role="alert" class="field__error">{{ loadError() }}</p>
      } @else if (loading()) {
        <p class="section__loading">Cargando…</p>
      } @else if (detail()) {
        @let d = detail()!;

        <div class="split">
          <div class="split__main">
            <h2 class="section__title">Solicitud #{{ d.id }}</h2>

            @if (!terminalStatus(d.status)) {
              <at-pipeline [currentStatus]="d.status" />
            }

            <dl class="card card--detail">
              <dt>Estado</dt>
              <dd><at-state-badge [state]="d.status" /></dd>
              <dt>Prioridad</dt>
              <dd>
                @if (d.priority) {
                  <at-priority-badge [priority]="d.priority" />
                } @else {
                  <span>—</span>
                }
              </dd>
              <dt>Descripción</dt>
              <dd>{{ d.description }}</dd>
              <dt>Registro</dt>
              <dd>{{ d.registrationDateTime | dateTimeLabel }}</dd>
              <dt>Tipo</dt>
              <dd>{{ d.typeName }}</dd>
              <dt>Canal</dt>
              <dd>{{ d.channelName }}</dd>
              <dt>Solicitante</dt>
              <dd>{{ d.requesterName }}</dd>
              <dt>Asignado</dt>
              <dd>{{ d.assignedToName ?? '—' }}</dd>
            </dl>
          </div>

          <div class="split__aside">
            @if (showPrioritySuggestion()) {
              <section class="card" aria-labelledby="priority-suggestion-heading">
                <h3 id="priority-suggestion-heading" class="card__title">Orientación de prioridad</h3>
                <p class="card__hint">
                  <small>
                    Esta recomendación se calcula según las reglas vigentes para este tipo de solicitud.
                    Solo sirve como guía y no cambia la solicitud por sí sola.
                  </small>
                </p>
                <button class="btn btn--sm" type="button" (click)="loadSuggestion()" [disabled]="suggestionLoading()">
                  @if (suggestionLoading()) {
                    Consultando…
                  } @else {
                    Ver recomendación
                  }
                </button>
                @if (suggestionError()) {
                  <p role="alert" class="field__error">{{ suggestionError() }}</p>
                }
                @if (suggestion()) {
                  @let s = suggestion()!;
                  <p class="card__value">
                    <strong>Recomendada:</strong>
                    {{ s.suggestedPriority | displayLabel: 'priority' }}
                  </p>
                  @if (s.matchedRules?.length) {
                    <ul class="card__list">
                      @for (m of s.matchedRules; track (m.ruleId ?? $index)) {
                        <li>{{ m.name }} → {{ m.resultingPriority | displayLabel: 'priority' }}</li>
                      }
                    </ul>
                  } @else {
                    <p class="card__hint"><small>No hay una regla específica para este caso.</small></p>
                  }
                }
              </section>
            }

            <!-- Resumen IA: solo STAFF y ADMIN (contrato: GET /ai/summarize → STAFF, ADMIN) -->
            @if (canSummarizeAiRole()) {
              <section class="card" aria-labelledby="ai-summary-heading">
                <h3 id="ai-summary-heading" class="card__title">Resumen con IA</h3>
                <p class="card__hint">
                  <small>
                    Esta sección usa IA para resumir el estado y el historial de la solicitud. Es una
                    ayuda de lectura y no reemplaza la información oficial.
                  </small>
                </p>
                <button
                  class="btn btn--sm"
                  type="button"
                  (click)="loadAiSummary()"
                  [disabled]="aiSummaryLoading()"
                  aria-label="Generar resumen IA de esta solicitud"
                >
                  @if (aiSummaryLoading()) {
                    Generando resumen…
                  } @else {
                    Generar resumen
                  }
                </button>
                <at-ai-panel
                  [summary]="aiSummary()?.summary ?? null"
                  [generatedAt]="aiSummary()?.generatedAt"
                  [aiError]="aiSummaryError()"
                />
              </section>
            }
          </div>
        </div>

        <section class="card" aria-labelledby="history-heading">
          <h3 id="history-heading" class="card__title">Historial</h3>
          <at-terminal-history [entries]="history()" />
          @if (canNote()) {
            <form class="note-form" [formGroup]="noteForm" (ngSubmit)="submitNote()">
              <label class="field__label">
                Nota interna
                <textarea class="input" formControlName="observations" rows="3"></textarea>
              </label>
              <button class="btn btn--sm" type="submit" [disabled]="noteForm.invalid || noteSubmitting()">
                Añadir nota
              </button>
            </form>
          }
        </section>

        @if (actionError()) {
          <p role="alert" class="field__error">{{ actionError() }}</p>
        }

        @if (!terminalStatus(d.status)) {
          <section class="card" aria-labelledby="actions-heading">
            <h3 id="actions-heading" class="card__title">Acciones</h3>
            @if (catalogWarning() !== null) {
              <p class="card__hint" role="status">{{ catalogWarning() }}</p>
            }
            @if (canClassify()(d.status)) {
              <form class="action-form" [formGroup]="classifyForm" (ngSubmit)="submitClassify()">
                <h4 class="action-form__title">Clasificar</h4>
                <div class="field">
                  <label class="field__label" for="detail-classify-type">Tipo de solicitud</label>
                  <select class="input" id="detail-classify-type" formControlName="requestTypeId">
                    @for (t of requestTypesWithId(); track t.id) {
                      <option [ngValue]="t.id">{{ t.name }}</option>
                    }
                  </select>
                </div>
                <div class="field">
                  <label class="field__label" for="detail-classify-obs">Observaciones (opcional)</label>
                  <textarea
                    class="input"
                    id="detail-classify-obs"
                    formControlName="observations"
                    rows="2"
                  ></textarea>
                </div>
                <button class="btn btn--sm" type="submit" [disabled]="classifyForm.invalid || actionBusy()">
                  Clasificar
                </button>
              </form>
            }
            @if (canPrioritize()(d.status, d.priority)) {
              <form class="action-form" [formGroup]="prioritizeForm" (ngSubmit)="submitPrioritize()">
                <h4 class="action-form__title">Priorizar</h4>
                <div class="field">
                  <label class="field__label" for="detail-priority">Prioridad</label>
                  <select class="input" id="detail-priority" formControlName="priority">
                    @for (p of priorityOptions; track p) {
                      <option [ngValue]="p">{{ p | displayLabel: 'priority' }}</option>
                    }
                  </select>
                </div>
                <div class="field">
                  <label class="field__label" for="detail-priority-just">Justificación</label>
                  <textarea
                    class="input"
                    id="detail-priority-just"
                    formControlName="justification"
                    rows="2"
                  ></textarea>
                </div>
                <button class="btn btn--sm" type="submit" [disabled]="prioritizeForm.invalid || actionBusy()">
                  Priorizar
                </button>
              </form>
            }
            @if (canAssign()(d.status, d.priority)) {
              <form class="action-form" [formGroup]="assignForm" (ngSubmit)="submitAssign()">
                <h4 class="action-form__title">Asignar responsable</h4>
                <div class="field">
                  <label class="field__label" for="detail-assign-user">Usuario responsable</label>
                  <input class="input" id="detail-assign-user" type="number" formControlName="assignedToUserId" />
                  <small>Puedes tomar este dato del listado de usuarios.</small>
                </div>
                <div class="field">
                  <label class="field__label" for="detail-assign-obs">Observaciones (opcional)</label>
                  <textarea
                    class="input"
                    id="detail-assign-obs"
                    formControlName="observations"
                    rows="2"
                  ></textarea>
                </div>
                <button class="btn btn--sm" type="submit" [disabled]="assignForm.invalid || actionBusy()">
                  Asignar
                </button>
              </form>
            }
            @if (canAttend()(d.status)) {
              <form class="action-form" [formGroup]="attendForm" (ngSubmit)="submitAttend()">
                <h4 class="action-form__title">Atender</h4>
                <div class="field">
                  <label class="field__label" for="detail-attend-obs">Observaciones</label>
                  <textarea
                    class="input"
                    id="detail-attend-obs"
                    formControlName="observations"
                    rows="3"
                  ></textarea>
                </div>
                <button class="btn btn--sm" type="submit" [disabled]="attendForm.invalid || actionBusy()">
                  Marcar como atendida
                </button>
              </form>
            }
            @if (canClose()(d.status)) {
              <form class="action-form" [formGroup]="closeForm" (ngSubmit)="submitClose()">
                <h4 class="action-form__title">Cerrar</h4>
                <div class="field">
                  <label class="field__label" for="detail-close-obs">Observación de cierre</label>
                  <textarea
                    class="input"
                    id="detail-close-obs"
                    formControlName="closingObservation"
                    rows="3"
                  ></textarea>
                </div>
                <button class="btn btn--sm" type="submit" [disabled]="closeForm.invalid || actionBusy()">
                  Cerrar solicitud
                </button>
              </form>
            }
            @if (canCancel()(d.status)) {
              <form class="action-form" [formGroup]="cancelForm" (ngSubmit)="submitCancel()">
                <h4 class="action-form__title">Cancelar</h4>
                <div class="field">
                  <label class="field__label" for="detail-cancel-reason">Motivo de cancelación</label>
                  <textarea
                    class="input"
                    id="detail-cancel-reason"
                    formControlName="cancellationReason"
                    rows="3"
                  ></textarea>
                </div>
                <button class="btn btn--sm" type="submit" [disabled]="cancelForm.invalid || actionBusy()">
                  Cancelar solicitud
                </button>
              </form>
            }
            @if (canReject()(d.status)) {
              <form class="action-form" [formGroup]="rejectForm" (ngSubmit)="submitReject()">
                <h4 class="action-form__title">Rechazar (ADMIN)</h4>
                <div class="field">
                  <label class="field__label" for="detail-reject-reason">Motivo de rechazo</label>
                  <textarea
                    class="input"
                    id="detail-reject-reason"
                    formControlName="rejectionReason"
                    rows="3"
                  ></textarea>
                </div>
                <button class="btn btn--sm" type="submit" [disabled]="rejectForm.invalid || actionBusy()">
                  Rechazar
                </button>
              </form>
            }
          </section>
        }
      }
    </section>
  `,
  styles: `
    .section { padding: var(--at-s6); }
    .section__back { margin-bottom: var(--at-s3); font-size: var(--at-fs-sm); }
    .section__title {
      font-size: var(--at-fs-xl);
      font-weight: 800;
      letter-spacing: var(--at-tracking-tight);
      margin-bottom: var(--at-s3);
    }
    .section__loading { color: var(--at-text-muted); font-family: var(--at-font-mono); }
    .split {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: var(--at-s4);
      margin-bottom: var(--at-s4);
    }
    .card {
      background: var(--at-surface);
      border: 1px solid var(--at-border);
      padding: var(--at-s4);
      margin-bottom: var(--at-s3);
    }
    .card--detail {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: var(--at-s1) var(--at-s3);
    }
    .card--detail dt {
      font-size: var(--at-fs-sm);
      color: var(--at-text-muted);
      font-family: var(--at-font-mono);
    }
    .card__title {
      font-size: var(--at-fs-base);
      font-weight: 800;
      margin-bottom: var(--at-s2);
      color: var(--at-mercury);
    }
    .card__hint { font-size: var(--at-fs-sm); color: var(--at-text-muted); margin-bottom: var(--at-s2); }
    .card__value { margin: var(--at-s2) 0; }
    .card__list { padding-left: var(--at-s3); font-size: var(--at-fs-sm); color: var(--at-text-muted); }
    .note-form { margin-top: var(--at-s3); display: flex; flex-direction: column; gap: var(--at-s2); }
    .action-form { border-top: 1px solid var(--at-border); padding-top: var(--at-s3); margin-top: var(--at-s3); display: flex; flex-direction: column; gap: var(--at-s2); }
    .action-form__title { font-size: var(--at-fs-sm); font-weight: 800; color: var(--at-text-muted); margin-bottom: var(--at-s1); }
    .field { display: flex; flex-direction: column; gap: var(--at-s1); }
    .field__label { font-size: var(--at-fs-sm); color: var(--at-text-muted); font-family: var(--at-font-mono); }
    .field__error { font-size: var(--at-fs-sm); color: var(--at-danger); padding: var(--at-s1) var(--at-s2); background: var(--at-err-bg); margin-bottom: var(--at-s2); }
    @media (max-width: 768px) {
      .split { grid-template-columns: 1fr; }
    }
  `,
})
export class RequestDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(RequestsApiService);
  private readonly aiApi = inject(AiApiService);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly problemMapper = inject(ProblemErrorMapper);
  private readonly session = inject(AuthSessionStore);
  private readonly fb = inject(FormBuilder);

  private requestId = 0;

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly detail = signal<RequestDetailView | null>(null);
  protected readonly history = signal<HistoryEntryView[]>([]);
  protected readonly actionError = signal<string | null>(null);
  protected readonly actionBusy = signal(false);
  protected readonly suggestion = signal<PrioritySuggestionResponse | null>(null);
  protected readonly suggestionLoading = signal(false);
  protected readonly suggestionError = signal<string | null>(null);
  protected readonly requestTypes = signal<RequestTypeResponse[]>([]);

  protected readonly aiSummaryLoading = signal(false);
  protected readonly aiSummaryError = signal<string | null>(null);
  protected readonly aiSummary = signal<AiSummaryResponse | null>(null);

  protected readonly catalogWarning = signal<string | null>(null);
  protected readonly noteSubmitting = signal(false);

  protected readonly priorityOptions: PriorityEnum[] = ['HIGH', 'MEDIUM', 'LOW'];

  protected readonly noteForm = this.fb.nonNullable.group({
    observations: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  protected readonly classifyForm = this.fb.nonNullable.group({
    requestTypeId: this.fb.control<number | null>(null, Validators.required),
    observations: this.fb.nonNullable.control('', Validators.maxLength(1000)),
  });

  protected readonly prioritizeForm = this.fb.nonNullable.group({
    priority: this.fb.control<PriorityEnum | null>(null, Validators.required),
    justification: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(1000)]],
  });

  protected readonly assignForm = this.fb.nonNullable.group({
    assignedToUserId: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
    ]),
    observations: this.fb.nonNullable.control('', Validators.maxLength(1000)),
  });

  protected readonly attendForm = this.fb.nonNullable.group({
    observations: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(2000)]],
  });

  protected readonly closeForm = this.fb.nonNullable.group({
    closingObservation: [
      '',
      [Validators.required, Validators.minLength(5), Validators.maxLength(2000)],
    ],
  });

  protected readonly cancelForm = this.fb.nonNullable.group({
    cancellationReason: [
      '',
      [Validators.required, Validators.minLength(5), Validators.maxLength(2000)],
    ],
  });

  protected readonly rejectForm = this.fb.nonNullable.group({
    rejectionReason: [
      '',
      [Validators.required, Validators.minLength(5), Validators.maxLength(2000)],
    ],
  });

  protected readonly terminalStatus = isTerminalStatus;

  protected readonly canClassify = computed(() => {
    const role = this.session.role();
    return (status: RequestStatusEnum | undefined) => canShowClassify(role, status);
  });

  protected readonly canPrioritize = computed(() => {
    const role = this.session.role();
    return (status: RequestStatusEnum | undefined, priority: PriorityEnum | null | undefined) =>
      canShowPrioritize(role, status, priority);
  });

  protected readonly canAssign = computed(() => {
    const role = this.session.role();
    return (status: RequestStatusEnum | undefined, priority: PriorityEnum | null | undefined) =>
      canShowAssign(role, status, priority);
  });

  protected readonly canAttend = computed(() => {
    const role = this.session.role();
    return (status: RequestStatusEnum | undefined) => canShowAttend(role, status);
  });

  protected readonly canClose = computed(() => {
    const role = this.session.role();
    return (status: RequestStatusEnum | undefined) => canShowClose(role, status);
  });

  protected readonly canCancel = computed(() => {
    const role = this.session.role();
    const uid = this.session.user()?.id;
    return (status: RequestStatusEnum | undefined) =>
      canShowCancel(role, status, this.detail()?.requesterId, uid);
  });

  protected readonly canReject = computed(() => {
    const role = this.session.role();
    return (status: RequestStatusEnum | undefined) => canShowReject(role, status);
  });

  protected readonly canNote = computed(() => canShowAddHistoryNote(this.session.role()));

  protected readonly showPrioritySuggestion = computed(() => {
    const d = this.detail();
    if (d === null) {
      return false;
    }

    return !isTerminalStatus(d.status) && d.priority === null;
  });

  /** GET /ai/summarize/{requestId} → STAFF, ADMIN (contrato OpenAPI). */
  protected readonly canSummarizeAiRole = computed(() => {
    const r = this.session.role();
    return r === 'STAFF' || r === 'ADMIN';
  });

  protected readonly requestTypesWithId = computed(() =>
    this.requestTypes().filter(
      (t): t is RequestTypeResponse & { id: number } => typeof t.id === 'number',
    ),
  );

  constructor() {
    this.catalogApi
      .listRequestTypes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (t) => this.requestTypes.set(t),
        error: () =>
          this.catalogWarning.set(
            'No pudimos cargar el catálogo de tipos para los formularios de acción.',
          ),
      });

    this.route.paramMap
      .pipe(
        map((p) => Number(p.get('requestId'))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((id) => {
        if (!Number.isFinite(id)) {
          this.loadError.set('No pudimos identificar la solicitud que deseas ver.');
          return;
        }
        this.requestId = id;
        this.reload();
      });
  }

  protected loadSuggestion(): void {
    this.suggestionError.set(null);
    this.suggestionLoading.set(true);
    this.api
      .getPrioritySuggestion(this.requestId)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          this.suggestionError.set(
            p?.detail ?? p?.title ?? 'No pudimos calcular una recomendación en este momento.',
          );
          return EMPTY;
        }),
        finalize(() => this.suggestionLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((s) => this.suggestion.set(s));
  }

  protected loadAiSummary(): void {
    this.aiSummaryError.set(null);
    this.aiSummary.set(null);
    this.aiSummaryLoading.set(true);
    this.aiApi
      .summarizeRequest(this.requestId)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status === 503) {
            this.aiSummaryError.set(AI_UNAVAILABLE_MSG);
          } else {
            const p = this.problemMapper.fromHttpError(err);
            this.aiSummaryError.set(
              p?.detail ?? p?.title ?? 'No pudimos generar el resumen en este momento.',
            );
          }
          return EMPTY;
        }),
        finalize(() => this.aiSummaryLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((summary) => this.aiSummary.set(summary));
  }

  protected submitNote(): void {
    if (this.noteForm.invalid) {
      return;
    }
    this.noteSubmitting.set(true);
    this.actionError.set(null);
    this.api
      .addHistoryNote(this.requestId, this.noteForm.getRawValue())
      .pipe(
        catchError((err: HttpErrorResponse) => {
          this.actionError.set(this.mapErr(err));
          return EMPTY;
        }),
        finalize(() => this.noteSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.noteForm.reset({ observations: '' });
        this.reloadHistoryOnly();
      });
  }

  protected submitClassify(): void {
    const v = this.classifyForm.getRawValue();
    if (v.requestTypeId === null) {
      return;
    }
    this.runAction(
      this.api.classifyRequest(this.requestId, {
        requestTypeId: v.requestTypeId,
        observations: v.observations === '' ? undefined : v.observations,
      }),
    );
  }

  protected submitPrioritize(): void {
    const v = this.prioritizeForm.getRawValue();
    if (v.priority === null) {
      return;
    }
    this.runAction(
      this.api.prioritizeRequest(this.requestId, {
        priority: v.priority,
        justification: v.justification,
      }),
    );
  }

  protected submitAssign(): void {
    const v = this.assignForm.getRawValue();
    if (v.assignedToUserId === null) {
      return;
    }
    this.runAction(
      this.api.assignRequest(this.requestId, {
        assignedToUserId: v.assignedToUserId,
        observations: v.observations === '' ? undefined : v.observations,
      }),
    );
  }

  protected submitAttend(): void {
    this.runAction(this.api.attendRequest(this.requestId, this.attendForm.getRawValue()));
  }

  protected submitClose(): void {
    this.runAction(this.api.closeRequest(this.requestId, this.closeForm.getRawValue()));
  }

  protected submitCancel(): void {
    this.runAction(this.api.cancelRequest(this.requestId, this.cancelForm.getRawValue()));
  }

  protected submitReject(): void {
    this.runAction(this.api.rejectRequest(this.requestId, this.rejectForm.getRawValue()));
  }

  private mapErr(err: HttpErrorResponse): string {
    const p = this.problemMapper.fromHttpError(err);
    return p?.detail ?? p?.title ?? 'No pudimos completar la acción. Inténtalo de nuevo.';
  }

  private runAction(obs: Observable<RequestResponse>): void {
    this.actionBusy.set(true);
    this.actionError.set(null);
    obs
      .pipe(
        catchError((err: HttpErrorResponse) => {
          this.actionError.set(this.mapErr(err));
          return EMPTY;
        }),
        finalize(() => this.actionBusy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.reload());
  }

  private reload(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api
      .getRequestById(this.requestId)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          this.loadError.set(
            p?.detail ?? p?.title ?? 'No pudimos cargar la solicitud en este momento.',
          );
          return EMPTY;
        }),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((detail) => {
        this.detail.set(adaptRequestDetail(detail));
        this.history.set((detail.history ?? []).map(adaptHistoryEntry));
      });
  }

  private reloadHistoryOnly(): void {
    this.api
      .getRequestHistory(this.requestId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (h) => this.history.set(h.map(adaptHistoryEntry)),
        error: (err: HttpErrorResponse) => {
          this.actionError.set(this.mapErr(err));
        },
      });
  }
}
