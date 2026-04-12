import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, finalize } from 'rxjs';
import { EMPTY, forkJoin, type Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { AuthSessionStore } from '@core/auth/auth-session.store';
import { ProblemErrorMapper } from '@core/http/problem-error.mapper';

import {
  adaptHistoryEntry,
  adaptRequestDetail,
} from '../adapters/request-detail.adapter';
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
const AI_UNAVAILABLE_MSG =
  'La asistencia de IA no está disponible en este entorno.';

@Component({
  selector: 'at-request-detail-page',
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <p><a routerLink="/app/requests/list">← Listado</a></p>
      @if (loadError()) {
        <p role="alert">{{ loadError() }}</p>
      } @else if (loading()) {
        <p>Cargando…</p>
      } @else if (detail()) {
        @let d = detail()!;
        <h2>Solicitud #{{ d.id }}</h2>
        <dl>
          <dt>Estado</dt>
          <dd>{{ d.statusLabel }}</dd>
          <dt>Descripción</dt>
          <dd>{{ d.description }}</dd>
          <dt>Registro</dt>
          <dd>{{ d.registrationDateTime }}</dd>
          <dt>Prioridad</dt>
          <dd>{{ d.priorityLabel ?? '—' }}</dd>
          <dt>Tipo</dt>
          <dd>{{ d.typeName }}</dd>
          <dt>Canal</dt>
          <dd>{{ d.channelName }}</dd>
          <dt>Solicitante</dt>
          <dd>{{ d.requesterName }}</dd>
          <dt>Asignado</dt>
          <dd>{{ d.assignedToName ?? '—' }}</dd>
        </dl>

        <section>
          <h3>Sugerencia de prioridad (solo lectura)</h3>
          <button type="button" (click)="loadSuggestion()" [disabled]="suggestionLoading()">
            @if (suggestionLoading()) {
              Consultando…
            } @else {
              Obtener sugerencia
            }
          </button>
          @if (suggestionError()) {
            <p role="alert">{{ suggestionError() }}</p>
          }
          @if (suggestion()) {
            @let s = suggestion()!;
            <p><strong>Sugerida:</strong> {{ s.suggestedPriority }}</p>
            @if (s.matchedRules?.length) {
              <ul>
                @for (m of s.matchedRules; track $index) {
                  <li>
                    {{ m.name }} → {{ m.resultingPriority }} (regla #{{ m.ruleId }})
                  </li>
                }
              </ul>
            }
          }
        </section>

        <!-- Resumen IA: solo STAFF y ADMIN (contrato: GET /ai/summarize → STAFF, ADMIN) -->
        @if (canSummarizeAiRole()) {
          <section aria-labelledby="ai-summary-heading">
            <h3 id="ai-summary-heading">Resumen IA (asistencia de lectura)</h3>
            <p>
              <small>
                Generado por IA a partir del estado e historial de la solicitud.
                No reemplaza los datos oficiales. No disponible en todos los entornos.
              </small>
            </p>
            <button
              type="button"
              (click)="loadAiSummary()"
              [disabled]="aiSummaryLoading()"
              aria-label="Generar resumen IA de esta solicitud"
            >
              @if (aiSummaryLoading()) {
                Generando resumen…
              } @else {
                Obtener resumen IA
              }
            </button>
            @if (aiSummaryError()) {
              <p role="status">{{ aiSummaryError() }}</p>
            }
            @if (aiSummary()) {
              @let sum = aiSummary()!;
              <div role="region" aria-label="Resumen generado por IA">
                <p>{{ sum.summary }}</p>
                @if (sum.generatedAt) {
                  <p>
                    <small>
                      Generado el {{ sum.generatedAt | date: 'dd/MM/yyyy HH:mm' }}
                    </small>
                  </p>
                }
              </div>
            }
          </section>
        }

        <section>
          <h3>Historial</h3>
          <ul>
            @for (h of history(); track h.id) {
              <li>
                <strong>{{ h.timestamp }}</strong> — {{ h.action }}
                ({{ h.performedByName }})
                @if (h.observations) {
                  <div>{{ h.observations }}</div>
                }
              </li>
            }
          </ul>
          @if (canNote()) {
            <form [formGroup]="noteForm" (ngSubmit)="submitNote()">
              <label>
                Nota interna (STAFF)
                <textarea formControlName="observations" rows="3"></textarea>
              </label>
              <button type="submit" [disabled]="noteForm.invalid || noteSubmitting()">
                Añadir nota
              </button>
            </form>
          }
        </section>

        @if (actionError()) {
          <p role="alert">{{ actionError() }}</p>
        }

        @if (!terminalStatus(d.status)) {
          <section>
            <h3>Acciones</h3>
            @if (canClassify()(d.status)) {
              <form [formGroup]="classifyForm" (ngSubmit)="submitClassify()">
                <h4>Clasificar</h4>
                <div>
                  <label for="detail-classify-type">Tipo de solicitud</label>
                  <select id="detail-classify-type" formControlName="requestTypeId">
                    @for (t of requestTypes(); track t.id) {
                      <option [ngValue]="t.id">{{ t.name }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label for="detail-classify-obs">Observaciones (opcional)</label>
                  <textarea
                    id="detail-classify-obs"
                    formControlName="observations"
                    rows="2"
                  ></textarea>
                </div>
                <button type="submit" [disabled]="classifyForm.invalid || actionBusy()">
                  Clasificar
                </button>
              </form>
            }
            @if (canPrioritize()(d.status, d.priority)) {
              <form [formGroup]="prioritizeForm" (ngSubmit)="submitPrioritize()">
                <h4>Priorizar</h4>
                <div>
                  <label for="detail-priority">Prioridad</label>
                  <select id="detail-priority" formControlName="priority">
                    @for (p of priorityOptions; track p) {
                      <option [ngValue]="p">{{ p }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label for="detail-priority-just">Justificación</label>
                  <textarea id="detail-priority-just" formControlName="justification" rows="2"></textarea>
                </div>
                <button type="submit" [disabled]="prioritizeForm.invalid || actionBusy()">
                  Priorizar
                </button>
              </form>
            }
            @if (canAssign()(d.status, d.priority)) {
              <form [formGroup]="assignForm" (ngSubmit)="submitAssign()">
                <h4>Asignar responsable</h4>
                <div>
                  <label for="detail-assign-user">ID de usuario STAFF</label>
                  <input id="detail-assign-user" type="number" formControlName="assignedToUserId" />
                </div>
                <div>
                  <label for="detail-assign-obs">Observaciones (opcional)</label>
                  <textarea
                    id="detail-assign-obs"
                    formControlName="observations"
                    rows="2"
                  ></textarea>
                </div>
                <button type="submit" [disabled]="assignForm.invalid || actionBusy()">
                  Asignar
                </button>
              </form>
            }
            @if (canAttend()(d.status)) {
              <form [formGroup]="attendForm" (ngSubmit)="submitAttend()">
                <h4>Atender</h4>
                <div>
                  <label for="detail-attend-obs">Observaciones</label>
                  <textarea id="detail-attend-obs" formControlName="observations" rows="3"></textarea>
                </div>
                <button type="submit" [disabled]="attendForm.invalid || actionBusy()">
                  Marcar atendida
                </button>
              </form>
            }
            @if (canClose()(d.status)) {
              <form [formGroup]="closeForm" (ngSubmit)="submitClose()">
                <h4>Cerrar</h4>
                <div>
                  <label for="detail-close-obs">Observación de cierre</label>
                  <textarea id="detail-close-obs" formControlName="closingObservation" rows="3"></textarea>
                </div>
                <button type="submit" [disabled]="closeForm.invalid || actionBusy()">
                  Cerrar solicitud
                </button>
              </form>
            }
            @if (canCancel()(d.status)) {
              <form [formGroup]="cancelForm" (ngSubmit)="submitCancel()">
                <h4>Cancelar</h4>
                <div>
                  <label for="detail-cancel-reason">Motivo de cancelación</label>
                  <textarea id="detail-cancel-reason" formControlName="cancellationReason" rows="3"></textarea>
                </div>
                <button type="submit" [disabled]="cancelForm.invalid || actionBusy()">
                  Cancelar solicitud
                </button>
              </form>
            }
            @if (canReject()(d.status)) {
              <form [formGroup]="rejectForm" (ngSubmit)="submitReject()">
                <h4>Rechazar (ADMIN)</h4>
                <div>
                  <label for="detail-reject-reason">Motivo de rechazo</label>
                  <textarea id="detail-reject-reason" formControlName="rejectionReason" rows="3"></textarea>
                </div>
                <button type="submit" [disabled]="rejectForm.invalid || actionBusy()">
                  Rechazar
                </button>
              </form>
            }
          </section>
        }
      }
    </section>
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
    justification: [
      '',
      [Validators.required, Validators.minLength(5), Validators.maxLength(1000)],
    ],
  });

  protected readonly assignForm = this.fb.nonNullable.group({
    assignedToUserId: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
    ]),
    observations: this.fb.nonNullable.control('', Validators.maxLength(1000)),
  });

  protected readonly attendForm = this.fb.nonNullable.group({
    observations: [
      '',
      [Validators.required, Validators.minLength(5), Validators.maxLength(2000)],
    ],
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
    return (status: RequestStatusEnum | undefined) =>
      canShowClassify(role, status);
  });

  protected readonly canPrioritize = computed(() => {
    const role = this.session.role();
    return (
      status: RequestStatusEnum | undefined,
      priority: PriorityEnum | null | undefined,
    ) => canShowPrioritize(role, status, priority);
  });

  protected readonly canAssign = computed(() => {
    const role = this.session.role();
    return (
      status: RequestStatusEnum | undefined,
      priority: PriorityEnum | null | undefined,
    ) => canShowAssign(role, status, priority);
  });

  protected readonly canAttend = computed(() => {
    const role = this.session.role();
    return (status: RequestStatusEnum | undefined) =>
      canShowAttend(role, status);
  });

  protected readonly canClose = computed(() => {
    const role = this.session.role();
    return (status: RequestStatusEnum | undefined) =>
      canShowClose(role, status);
  });

  protected readonly canCancel = computed(() => {
    const role = this.session.role();
    const uid = this.session.user()?.id;
    return (status: RequestStatusEnum | undefined) =>
      canShowCancel(role, status, this.detail()?.requesterId, uid);
  });

  protected readonly canReject = computed(() => {
    const role = this.session.role();
    return (status: RequestStatusEnum | undefined) =>
      canShowReject(role, status);
  });

  protected readonly canNote = computed(() =>
    canShowAddHistoryNote(this.session.role()),
  );

  /** GET /ai/summarize/{requestId} → STAFF, ADMIN (contrato OpenAPI). */
  protected readonly canSummarizeAiRole = computed(() => {
    const r = this.session.role();
    return r === 'STAFF' || r === 'ADMIN';
  });

  constructor() {
    this.catalogApi.listRequestTypes().subscribe({
      next: (t) => this.requestTypes.set(t),
      error: () => {
        /* catálogo opcional para formularios de acción */
      },
    });

    this.route.paramMap
      .pipe(
        map((p) => Number(p.get('requestId'))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((id) => {
        if (!Number.isFinite(id)) {
          this.loadError.set('Identificador inválido.');
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
            p?.detail ?? p?.title ?? 'No se pudo obtener la sugerencia.',
          );
          return EMPTY;
        }),
        finalize(() => this.suggestionLoading.set(false)),
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
          this.aiSummaryError.set(
            err.status === 503
              ? AI_UNAVAILABLE_MSG
              : (this.problemMapper.fromHttpError(err)?.detail ??
                  this.problemMapper.fromHttpError(err)?.title ??
                  'No se pudo generar el resumen de IA.'),
          );
          return EMPTY;
        }),
        finalize(() => this.aiSummaryLoading.set(false)),
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
    this.runAction(
      this.api.attendRequest(this.requestId, this.attendForm.getRawValue()),
    );
  }

  protected submitClose(): void {
    this.runAction(
      this.api.closeRequest(this.requestId, this.closeForm.getRawValue()),
    );
  }

  protected submitCancel(): void {
    this.runAction(
      this.api.cancelRequest(this.requestId, this.cancelForm.getRawValue()),
    );
  }

  protected submitReject(): void {
    this.runAction(
      this.api.rejectRequest(this.requestId, this.rejectForm.getRawValue()),
    );
  }

  private mapErr(err: HttpErrorResponse): string {
    const p = this.problemMapper.fromHttpError(err);
    return p?.detail ?? p?.title ?? 'Error en la operación.';
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
      )
      .subscribe(() => this.reload());
  }

  private reload(): void {
    this.loading.set(true);
    this.loadError.set(null);
    forkJoin({
      detail: this.api.getRequestById(this.requestId),
      history: this.api.getRequestHistory(this.requestId),
    })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          this.loadError.set(
            p?.detail ?? p?.title ?? 'No se pudo cargar la solicitud.',
          );
          return EMPTY;
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe(({ detail, history }) => {
        this.detail.set(adaptRequestDetail(detail));
        this.history.set(history.map(adaptHistoryEntry));
      });
  }

  private reloadHistoryOnly(): void {
    this.api.getRequestHistory(this.requestId).subscribe({
      next: (h) => this.history.set(h.map(adaptHistoryEntry)),
      error: (err: HttpErrorResponse) => {
        this.actionError.set(this.mapErr(err));
      },
    });
  }
}
