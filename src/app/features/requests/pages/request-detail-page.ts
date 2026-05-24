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
import { catchError, EMPTY, finalize } from 'rxjs';
import { map } from 'rxjs/operators';

import { AuthSessionStore } from '@core/auth/auth-session.store';
import { ProblemErrorMapper } from '@core/http/problem-error.mapper';
import { DateTimeLabelPipe } from '@shared/pipes/date-time-label.pipe';
import { DisplayLabelPipe } from '@shared/pipes/display-label.pipe';
import { ErrorAlert } from '@shared/ui/error-alert';
import { FormField } from '@shared/ui/form-field/form-field';
import { StateBadge } from '@shared/ui/state-badge';
import { PriorityBadge } from '@shared/ui/priority-badge';
import { applyProblemToForm, clearServerErrors } from '@shared/utils/problem-field-mapper';
import { messageFor } from '@shared/i18n/validation-messages';

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

/** Standard message when the AI returns 503. */
const AI_UNAVAILABLE_MSG = 'La asistencia de IA no está disponible en este entorno.';

/**
 * Hint copy for the numeric staff-ID assignment field (UV-8 AC6).
 * Documented as technical debt until a staff selector is available (PRD §R8).
 */
const ASSIGN_STAFF_HINT =
  'Ingresá el ID numérico del miembro del staff. Próximamente: selector con búsqueda.';

/**
 * Recovery message shown when the backend rejects the assigned staff ID
 * (e.g. 404 Not Found or 422 validation) — UV-8 AC6.
 */
const ASSIGN_NOT_FOUND_MSG =
  'ID de staff inválido o usuario no encontrado. Verificá con el equipo.';

/** Control ID maps for applyProblemToForm — field name → DOM input id. */
const CLASSIFY_CONTROL_ID_MAP: Readonly<Record<string, string>> = {
  requestTypeId: 'detail-classify-type',
  observations: 'detail-classify-obs',
};
const PRIORITIZE_CONTROL_ID_MAP: Readonly<Record<string, string>> = {
  priority: 'detail-priority',
  justification: 'detail-priority-just',
};
const ASSIGN_CONTROL_ID_MAP: Readonly<Record<string, string>> = {
  assignedToUserId: 'detail-assign-user',
  observations: 'detail-assign-obs',
};
const ATTEND_CONTROL_ID_MAP: Readonly<Record<string, string>> = {
  observations: 'detail-attend-obs',
};
const CLOSE_CONTROL_ID_MAP: Readonly<Record<string, string>> = {
  closingObservation: 'detail-close-obs',
};
const CANCEL_CONTROL_ID_MAP: Readonly<Record<string, string>> = {
  cancellationReason: 'detail-cancel-reason',
};
const REJECT_CONTROL_ID_MAP: Readonly<Record<string, string>> = {
  rejectionReason: 'detail-reject-reason',
};

@Component({
  selector: 'at-request-detail-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DisplayLabelPipe,
    DateTimeLabelPipe,
    ErrorAlert,
    FormField,
    StateBadge,
    PriorityBadge,
    Pipeline,
    TerminalHistory,
    AiPanel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section">
      <a class="section__back" routerLink="/app/requests/list" aria-label="Volver a solicitudes">
        <span aria-hidden="true">←</span> Volver a solicitudes
      </a>

      @if (loadError()) {
        <p role="alert" class="field__error">{{ loadError() }}</p>
      } @else if (loading()) {
        <p class="section__loading">Cargando…</p>
      } @else if (detail()) {
        @let d = detail()!;

        <header class="page-head">
          <div class="page-head__title-block">
            <h2 class="page-head__title">
              Solicitud <span class="page-head__id">#{{ d.id }}</span>
            </h2>
            <ul class="page-head__meta" aria-label="Detalles de la solicitud">
              <li class="page-head__chip">
                <span class="page-head__chip-label">Tipo</span>
                <span class="page-head__chip-value" [title]="d.typeName">{{ d.typeName }}</span>
              </li>
              <li class="page-head__chip">
                <span class="page-head__chip-label">Canal</span>
                <span class="page-head__chip-value" [title]="d.channelName">{{
                  d.channelName
                }}</span>
              </li>
              <li class="page-head__chip">
                <span class="page-head__chip-label">Registrado</span>
                <span class="page-head__chip-value">{{
                  d.registrationDateTime | dateTimeLabel
                }}</span>
              </li>
            </ul>
          </div>

          <aside class="status-chip" aria-label="Estado actual">
            <span class="status-chip__label">Estado actual</span>
            <span class="status-chip__value">
              <at-state-badge [state]="d.status" />
            </span>
          </aside>
        </header>

        @if (!terminalStatus(d.status)) {
          <at-pipeline [currentStatus]="d.status" />
        }

        <div class="split">
          <div class="split__main">
            <section class="card" aria-labelledby="description-heading">
              <h3 id="description-heading" class="card__title">Descripción</h3>
              <p class="description">{{ d.description }}</p>

              <dl class="meta-grid">
                <div class="meta-grid__cell">
                  <dt>Fecha límite</dt>
                  <dd>
                    @if (d.deadline) {
                      {{ d.deadline | dateTimeLabel }}
                    } @else {
                      <span class="meta-grid__empty">—</span>
                    }
                  </dd>
                </div>
                <div class="meta-grid__cell">
                  <dt>Prioridad</dt>
                  <dd>
                    @if (d.priority) {
                      <at-priority-badge [priority]="d.priority" />
                    } @else {
                      <span class="meta-grid__empty">—</span>
                    }
                  </dd>
                </div>
                <div class="meta-grid__cell">
                  <dt>ID interno</dt>
                  <dd class="meta-grid__id">req_{{ d.id }}</dd>
                </div>
              </dl>
            </section>

            <section class="card" aria-labelledby="history-heading">
              <header class="card__header">
                <h3 id="history-heading" class="card__title">
                  Historial <span class="card__title-meta">// {{ history().length }} eventos</span>
                </h3>
                <span class="card__header-tag" aria-hidden="true">log stream ›_</span>
              </header>
              <at-terminal-history [entries]="history()" />
              @if (!terminalStatus(d.status)) {
                <p class="history__waiting" aria-hidden="true">
                  <span class="history__cursor"></span>
                  <em>esperando próximo evento</em>
                </p>
              }
              @if (canNote()) {
                <form class="note-form" [formGroup]="noteForm" (ngSubmit)="submitNote()">
                  <div class="field">
                    <label class="field__label" for="note-observations">Nota interna</label>
                    <textarea
                      class="input"
                      id="note-observations"
                      formControlName="observations"
                      rows="3"
                      [attr.aria-invalid]="
                        (noteForm.controls.observations.touched &&
                          !!noteForm.controls.observations.errors) ||
                        null
                      "
                    ></textarea>
                  </div>
                  <div class="note-form__actions">
                    <button
                      class="btn note-form__btn"
                      type="submit"
                      [disabled]="noteForm.invalid || noteSubmitting()"
                    >
                      Añadir nota
                    </button>
                  </div>
                </form>
              }
            </section>
          </div>

          <div class="split__aside">
            <section class="party-card" aria-labelledby="requester-heading">
              <h3 id="requester-heading" class="party-card__title">Solicitante</h3>
              <div class="party-card__body">
                <span
                  class="avatar"
                  [attr.data-initials]="initialsOf(d.requesterName)"
                  aria-hidden="true"
                ></span>
                <div class="party-card__id">
                  <p class="party-card__name">{{ d.requesterName }}</p>
                  <p class="party-card__sub">@{{ d.requesterName }}</p>
                </div>
              </div>
            </section>

            <section class="party-card" aria-labelledby="assignee-heading">
              <h3 id="assignee-heading" class="party-card__title">Responsable asignado</h3>
              @if (d.assignedToName) {
                <div class="party-card__body">
                  <span
                    class="avatar"
                    [attr.data-initials]="initialsOf(d.assignedToName)"
                    aria-hidden="true"
                  ></span>
                  <div class="party-card__id">
                    <p class="party-card__name">{{ d.assignedToName }}</p>
                    <p class="party-card__sub">STAFF</p>
                  </div>
                </div>
              } @else {
                <p class="party-card__empty">Sin asignar</p>
              }
            </section>

            @if (showPrioritySuggestion()) {
              <section class="card" aria-labelledby="priority-suggestion-heading">
                <h3 id="priority-suggestion-heading" class="card__title">Reglas aplicadas</h3>
                <p class="card__hint">
                  Recomendación según reglas vigentes para este tipo. No cambia la solicitud por sí
                  sola.
                </p>
                <button
                  class="btn btn--sm"
                  type="button"
                  (click)="loadSuggestion()"
                  [disabled]="suggestionLoading()"
                >
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
                    <strong>Prioridad recomendada:</strong>
                    {{ s.suggestedPriority | displayLabel: 'priority' }}
                  </p>
                  @if (s.matchedRules?.length) {
                    <ul class="rules-list">
                      @for (m of s.matchedRules; track m.ruleId ?? $index) {
                        <li class="rules-list__item">
                          <span class="rules-list__name">{{ m.name }}</span>
                          <span class="rules-list__priority">{{
                            m.resultingPriority | displayLabel: 'priority'
                          }}</span>
                        </li>
                      }
                    </ul>
                  } @else {
                    <p class="card__hint">No hay una regla específica para este caso.</p>
                  }
                }
              </section>
            }

            <!-- AI summary: STAFF and ADMIN only (contract: GET /ai/summarize → STAFF, ADMIN) -->
            @if (canSummarizeAiRole()) {
              <section class="card" aria-labelledby="ai-summary-heading">
                <h3 id="ai-summary-heading" class="card__title">
                  Asistente IA
                  @if (aiSummary()) {
                    <span class="card__title-tag">
                      <span class="card__title-dot"></span> completo
                    </span>
                  }
                </h3>
                <p class="card__hint">
                  IA para resumir estado e historial. Ayuda de lectura — no reemplaza la información
                  oficial.
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
                <at-form-field
                  label="Tipo de solicitud"
                  controlId="detail-classify-type"
                  [required]="true"
                  [errorMessage]="firstClassifyRequestTypeIdError()"
                  [invalid]="
                    classifyForm.controls.requestTypeId.touched &&
                    !!classifyForm.controls.requestTypeId.errors
                  "
                >
                  <select
                    class="input"
                    id="detail-classify-type"
                    formControlName="requestTypeId"
                    [attr.aria-required]="'true'"
                    [attr.aria-invalid]="
                      (classifyForm.controls.requestTypeId.touched &&
                        !!classifyForm.controls.requestTypeId.errors) ||
                      null
                    "
                    [attr.aria-describedby]="
                      firstClassifyRequestTypeIdError() ? 'detail-classify-type-error' : null
                    "
                  >
                    @for (t of requestTypesWithId(); track t.id) {
                      <option [ngValue]="t.id">{{ t.name }}</option>
                    }
                  </select>
                </at-form-field>
                <at-form-field
                  label="Observaciones (opcional)"
                  controlId="detail-classify-obs"
                  [errorMessage]="firstClassifyObservationsError()"
                  [invalid]="
                    classifyForm.controls.observations.touched &&
                    !!classifyForm.controls.observations.errors
                  "
                >
                  <textarea
                    class="input"
                    id="detail-classify-obs"
                    formControlName="observations"
                    rows="2"
                    [attr.aria-invalid]="
                      (classifyForm.controls.observations.touched &&
                        !!classifyForm.controls.observations.errors) ||
                      null
                    "
                    [attr.aria-describedby]="
                      firstClassifyObservationsError() ? 'detail-classify-obs-error' : null
                    "
                  ></textarea>
                </at-form-field>
                <at-error-alert variant="error" [message]="classifyError()" />
                <button
                  class="btn btn--sm"
                  type="submit"
                  [disabled]="classifyForm.invalid || actionBusy()"
                >
                  Clasificar
                </button>
              </form>
            }
            @if (canPrioritize()(d.status, d.priority)) {
              <form
                class="action-form"
                [formGroup]="prioritizeForm"
                (ngSubmit)="submitPrioritize()"
              >
                <h4 class="action-form__title">Priorizar</h4>
                <at-form-field
                  label="Prioridad"
                  controlId="detail-priority"
                  [required]="true"
                  [errorMessage]="null"
                  [invalid]="
                    prioritizeForm.controls.priority.touched &&
                    !!prioritizeForm.controls.priority.errors
                  "
                >
                  <select
                    class="input"
                    id="detail-priority"
                    formControlName="priority"
                    [attr.aria-required]="'true'"
                    [attr.aria-invalid]="
                      (prioritizeForm.controls.priority.touched &&
                        !!prioritizeForm.controls.priority.errors) ||
                      null
                    "
                  >
                    @for (p of priorityOptions; track p) {
                      <option [ngValue]="p">{{ p | displayLabel: 'priority' }}</option>
                    }
                  </select>
                </at-form-field>
                <at-form-field
                  label="Justificación"
                  controlId="detail-priority-just"
                  [required]="true"
                  [errorMessage]="firstPrioritizeJustificationError()"
                  [invalid]="
                    prioritizeForm.controls.justification.touched &&
                    !!prioritizeForm.controls.justification.errors
                  "
                >
                  <textarea
                    class="input"
                    id="detail-priority-just"
                    formControlName="justification"
                    rows="2"
                    [attr.aria-required]="'true'"
                    [attr.aria-invalid]="
                      (prioritizeForm.controls.justification.touched &&
                        !!prioritizeForm.controls.justification.errors) ||
                      null
                    "
                    [attr.aria-describedby]="
                      firstPrioritizeJustificationError() ? 'detail-priority-just-error' : null
                    "
                  ></textarea>
                </at-form-field>
                <at-error-alert variant="error" [message]="prioritizeError()" />
                <button
                  class="btn btn--sm"
                  type="submit"
                  [disabled]="prioritizeForm.invalid || actionBusy()"
                >
                  Priorizar
                </button>
              </form>
            }
            @if (canAssign()(d.status, d.priority)) {
              <form class="action-form" [formGroup]="assignForm" (ngSubmit)="submitAssign()">
                <h4 class="action-form__title">Asignar responsable</h4>
                <at-form-field
                  label="Usuario responsable (ID numérico del staff)"
                  controlId="detail-assign-user"
                  [required]="true"
                  [hint]="assignStaffHint"
                  [errorMessage]="firstAssignUserIdError()"
                  [invalid]="
                    assignForm.controls.assignedToUserId.touched &&
                    !!assignForm.controls.assignedToUserId.errors
                  "
                >
                  <input
                    class="input"
                    id="detail-assign-user"
                    type="number"
                    formControlName="assignedToUserId"
                    [attr.aria-required]="'true'"
                    [attr.aria-invalid]="
                      (assignForm.controls.assignedToUserId.touched &&
                        !!assignForm.controls.assignedToUserId.errors) ||
                      null
                    "
                    [attr.aria-describedby]="
                      firstAssignUserIdError()
                        ? 'detail-assign-user-hint detail-assign-user-error'
                        : 'detail-assign-user-hint'
                    "
                  />
                </at-form-field>
                <at-form-field
                  label="Observaciones (opcional)"
                  controlId="detail-assign-obs"
                  [errorMessage]="null"
                  [invalid]="false"
                >
                  <textarea
                    class="input"
                    id="detail-assign-obs"
                    formControlName="observations"
                    rows="2"
                    [attr.aria-invalid]="
                      (assignForm.controls.observations.touched &&
                        !!assignForm.controls.observations.errors) ||
                      null
                    "
                  ></textarea>
                </at-form-field>
                <at-error-alert variant="error" [message]="assignError()" />
                <button
                  class="btn btn--sm"
                  type="submit"
                  [disabled]="assignForm.invalid || actionBusy()"
                >
                  Asignar
                </button>
              </form>
            }
            @if (canAttend()(d.status)) {
              <form class="action-form" [formGroup]="attendForm" (ngSubmit)="submitAttend()">
                <h4 class="action-form__title">Atender</h4>
                <at-form-field
                  label="Observaciones"
                  controlId="detail-attend-obs"
                  [required]="true"
                  [errorMessage]="firstAttendObservationsError()"
                  [invalid]="
                    attendForm.controls.observations.touched &&
                    !!attendForm.controls.observations.errors
                  "
                >
                  <textarea
                    class="input"
                    id="detail-attend-obs"
                    formControlName="observations"
                    rows="3"
                    [attr.aria-required]="'true'"
                    [attr.aria-invalid]="
                      (attendForm.controls.observations.touched &&
                        !!attendForm.controls.observations.errors) ||
                      null
                    "
                    [attr.aria-describedby]="
                      firstAttendObservationsError() ? 'detail-attend-obs-error' : null
                    "
                  ></textarea>
                </at-form-field>
                <at-error-alert variant="error" [message]="attendError()" />
                <button
                  class="btn btn--sm"
                  type="submit"
                  [disabled]="attendForm.invalid || actionBusy()"
                >
                  Marcar como atendida
                </button>
              </form>
            }
            @if (canClose()(d.status)) {
              <form class="action-form" [formGroup]="closeForm" (ngSubmit)="submitClose()">
                <h4 class="action-form__title">Cerrar</h4>
                <at-form-field
                  label="Observación de cierre"
                  controlId="detail-close-obs"
                  [required]="true"
                  [errorMessage]="firstCloseObservationError()"
                  [invalid]="
                    closeForm.controls.closingObservation.touched &&
                    !!closeForm.controls.closingObservation.errors
                  "
                >
                  <textarea
                    class="input"
                    id="detail-close-obs"
                    formControlName="closingObservation"
                    rows="3"
                    [attr.aria-required]="'true'"
                    [attr.aria-invalid]="
                      (closeForm.controls.closingObservation.touched &&
                        !!closeForm.controls.closingObservation.errors) ||
                      null
                    "
                    [attr.aria-describedby]="
                      firstCloseObservationError() ? 'detail-close-obs-error' : null
                    "
                  ></textarea>
                </at-form-field>
                <at-error-alert variant="error" [message]="closeError()" />
                <button
                  class="btn btn--sm"
                  type="submit"
                  [disabled]="closeForm.invalid || actionBusy()"
                >
                  Cerrar solicitud
                </button>
              </form>
            }
            @if (canCancel()(d.status)) {
              <form class="action-form" [formGroup]="cancelForm" (ngSubmit)="submitCancel()">
                <h4 class="action-form__title">Cancelar</h4>
                <at-form-field
                  label="Motivo de cancelación"
                  controlId="detail-cancel-reason"
                  [required]="true"
                  [errorMessage]="firstCancelReasonError()"
                  [invalid]="
                    cancelForm.controls.cancellationReason.touched &&
                    !!cancelForm.controls.cancellationReason.errors
                  "
                >
                  <textarea
                    class="input"
                    id="detail-cancel-reason"
                    formControlName="cancellationReason"
                    rows="3"
                    [attr.aria-required]="'true'"
                    [attr.aria-invalid]="
                      (cancelForm.controls.cancellationReason.touched &&
                        !!cancelForm.controls.cancellationReason.errors) ||
                      null
                    "
                    [attr.aria-describedby]="
                      firstCancelReasonError() ? 'detail-cancel-reason-error' : null
                    "
                  ></textarea>
                </at-form-field>
                <at-error-alert variant="error" [message]="cancelError()" />
                <button
                  class="btn btn--sm"
                  type="submit"
                  [disabled]="cancelForm.invalid || actionBusy()"
                >
                  Cancelar solicitud
                </button>
              </form>
            }
            @if (canReject()(d.status)) {
              <form class="action-form" [formGroup]="rejectForm" (ngSubmit)="submitReject()">
                <h4 class="action-form__title">Rechazar (ADMIN)</h4>
                <at-form-field
                  label="Motivo de rechazo"
                  controlId="detail-reject-reason"
                  [required]="true"
                  [errorMessage]="firstRejectReasonError()"
                  [invalid]="
                    rejectForm.controls.rejectionReason.touched &&
                    !!rejectForm.controls.rejectionReason.errors
                  "
                >
                  <textarea
                    class="input"
                    id="detail-reject-reason"
                    formControlName="rejectionReason"
                    rows="3"
                    [attr.aria-required]="'true'"
                    [attr.aria-invalid]="
                      (rejectForm.controls.rejectionReason.touched &&
                        !!rejectForm.controls.rejectionReason.errors) ||
                      null
                    "
                    [attr.aria-describedby]="
                      firstRejectReasonError() ? 'detail-reject-reason-error' : null
                    "
                  ></textarea>
                </at-form-field>
                <at-error-alert variant="error" [message]="rejectError()" />
                <button
                  class="btn btn--sm"
                  type="submit"
                  [disabled]="rejectForm.invalid || actionBusy()"
                >
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
    .section {
      padding: var(--at-s6);
      max-width: 1200px;
      margin: 0 auto;
    }
    .section__back {
      align-self: flex-start;
      display: inline-flex;
      align-items: center;
      gap: var(--at-s1);
      margin-bottom: var(--at-s4);
      padding: var(--at-s1) var(--at-s2);
      color: var(--at-text-muted);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      letter-spacing: var(--at-tracking-wide);
      text-transform: uppercase;
      text-decoration: none;
      transition: color var(--at-dur-fast) var(--at-ease);
    }
    .section__back:hover {
      color: var(--at-mercury);
    }

    .page-head {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: var(--at-s4);
      align-items: start;
      margin-bottom: var(--at-s5);
    }
    .page-head__title-block {
      min-width: 0;
    }
    .page-head__title {
      margin: 0 0 var(--at-s2);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-3xl);
      font-weight: 800;
      letter-spacing: var(--at-tracking-tight);
      text-transform: uppercase;
      color: var(--at-text);
      line-height: 1.05;
    }
    .page-head__id {
      color: var(--at-mercury);
    }
    .page-head__meta {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      align-items: stretch;
      gap: var(--at-s2);
    }
    .page-head__chip {
      display: inline-flex;
      align-items: center;
      gap: var(--at-s2);
      max-width: 22rem;
      padding: var(--at-s1) var(--at-s3);
      background: var(--at-surface);
      border: 1px solid var(--at-border);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
    }
    .page-head__chip-label {
      flex-shrink: 0;
      color: var(--at-text-dim);
      letter-spacing: var(--at-tracking-wide);
      text-transform: uppercase;
    }
    .page-head__chip-label::after {
      content: '·';
      margin-left: var(--at-s2);
      color: var(--at-border-hi);
    }
    .page-head__chip-value {
      color: var(--at-text);
      letter-spacing: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: var(--at-s3);
      padding: var(--at-s3) var(--at-s4);
      background: var(--at-surface);
      border: 1px solid var(--at-border-hi);
    }
    .status-chip__label {
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      letter-spacing: var(--at-tracking-wide);
      text-transform: uppercase;
      color: var(--at-text-muted);
    }

    .section__loading {
      color: var(--at-text-muted);
      font-family: var(--at-font-mono);
    }
    .split {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: var(--at-s4);
      margin-bottom: var(--at-s4);
      align-items: start;
    }
    .card {
      background: var(--at-surface);
      border: 1px solid var(--at-border);
      padding: var(--at-s5);
      margin-bottom: var(--at-s4);
    }
    .card--detail {
      display: grid;
      grid-template-columns: 9rem 1fr;
      gap: var(--at-s3) var(--at-s4);
    }
    .card--detail dt {
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      letter-spacing: var(--at-tracking-wide);
      text-transform: uppercase;
      color: var(--at-text-muted);
      align-self: center;
    }
    .card--detail dd {
      margin: 0;
      color: var(--at-text);
      align-self: center;
    }
    .card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--at-s2);
      margin-bottom: var(--at-s3);
    }
    .card__header-tag {
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      letter-spacing: var(--at-tracking-wide);
      text-transform: uppercase;
      color: var(--at-text-dim);
    }
    .card__title {
      margin: 0 0 var(--at-s3);
      display: inline-flex;
      align-items: center;
      gap: var(--at-s2);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      font-weight: 800;
      letter-spacing: var(--at-tracking-wide);
      text-transform: uppercase;
      color: var(--at-mercury);
    }
    .card__header .card__title {
      margin: 0;
    }
    .card__title-meta {
      color: var(--at-text-dim);
      font-weight: 600;
    }
    .card__title-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-left: auto;
      color: var(--at-success);
      font-weight: 600;
    }
    .card__title-dot {
      width: 6px;
      height: 6px;
      background: var(--at-success);
      border-radius: 50%;
      box-shadow: 0 0 6px var(--at-success);
    }

    .description {
      margin: 0 0 var(--at-s4);
      padding: var(--at-s3) 0;
      border-bottom: 1px solid var(--at-border);
      color: var(--at-text);
      line-height: 1.6;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--at-s4);
      margin: 0;
    }
    .meta-grid__cell {
      display: flex;
      flex-direction: column;
      gap: var(--at-s2);
    }
    .meta-grid__cell dt {
      margin: 0;
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      letter-spacing: var(--at-tracking-wide);
      text-transform: uppercase;
      color: var(--at-text-muted);
    }
    .meta-grid__cell dd {
      margin: 0;
      color: var(--at-text);
    }
    .meta-grid__id {
      font-family: var(--at-font-mono);
      color: var(--at-text-muted);
    }
    .meta-grid__empty {
      color: var(--at-text-dim);
    }

    .party-card {
      background: var(--at-surface);
      border: 1px solid var(--at-border);
      padding: var(--at-s4);
      margin-bottom: var(--at-s3);
    }
    .party-card__title {
      margin: 0 0 var(--at-s3);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      letter-spacing: var(--at-tracking-wide);
      text-transform: uppercase;
      color: var(--at-text-muted);
    }
    .party-card__body {
      display: flex;
      align-items: center;
      gap: var(--at-s3);
    }
    .party-card__id {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .party-card__name {
      margin: 0;
      font-weight: 700;
      color: var(--at-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .party-card__sub {
      margin: 0;
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      letter-spacing: var(--at-tracking-wide);
      color: var(--at-text-dim);
    }
    .party-card__empty {
      margin: 0;
      color: var(--at-text-dim);
      font-style: italic;
    }

    .avatar {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: repeating-linear-gradient(45deg, var(--at-surface-2) 0 2px, var(--at-bg) 2px 4px);
      border: 1px solid var(--at-border-hi);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      font-weight: 700;
      letter-spacing: 0.05em;
      color: var(--at-text);
    }
    .avatar::before {
      content: attr(data-initials);
      background: var(--at-surface);
      padding: 2px 6px;
    }

    .rules-list {
      list-style: none;
      padding: 0;
      margin: var(--at-s2) 0 0;
      display: flex;
      flex-direction: column;
      gap: var(--at-s2);
    }
    .rules-list__item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--at-s3);
      padding: var(--at-s2) 0;
      border-top: 1px dashed var(--at-border);
      font-size: var(--at-fs-sm);
    }
    .rules-list__item:first-child {
      border-top: 0;
      padding-top: 0;
    }
    .rules-list__name {
      color: var(--at-text);
    }
    .rules-list__priority {
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      letter-spacing: var(--at-tracking-wide);
      text-transform: uppercase;
      color: var(--at-text-muted);
    }

    .history__waiting {
      margin: var(--at-s3) 0 0;
      display: inline-flex;
      align-items: center;
      gap: var(--at-s2);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      letter-spacing: var(--at-tracking-wide);
      color: var(--at-text-dim);
    }
    .history__cursor {
      display: inline-block;
      width: 8px;
      height: 14px;
      background: var(--at-mercury);
      animation: blink 1.1s steps(2, end) infinite;
    }
    .card__hint {
      font-size: var(--at-fs-sm);
      color: var(--at-text-muted);
      margin: 0 0 var(--at-s3);
      line-height: 1.5;
    }
    .card__value {
      margin: var(--at-s3) 0;
    }
    .card__list {
      padding-left: var(--at-s4);
      margin: var(--at-s2) 0 0;
      font-size: var(--at-fs-sm);
      color: var(--at-text-muted);
    }

    .note-form {
      margin-top: var(--at-s4);
      padding-top: var(--at-s4);
      border-top: 1px solid var(--at-border);
      display: flex;
      flex-direction: column;
      gap: var(--at-s3);
    }
    .note-form__actions {
      display: flex;
      justify-content: flex-end;
    }
    .note-form__btn {
      min-width: 8rem;
      justify-content: center;
    }

    .action-form {
      border-top: 1px solid var(--at-border);
      padding-top: var(--at-s4);
      margin-top: var(--at-s4);
      display: flex;
      flex-direction: column;
      gap: var(--at-s3);
    }
    .action-form__title {
      margin: 0 0 var(--at-s1);
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      font-weight: 800;
      letter-spacing: var(--at-tracking-wide);
      text-transform: uppercase;
      color: var(--at-text-muted);
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: var(--at-s2);
    }
    .field__label {
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      letter-spacing: var(--at-tracking-wide);
      text-transform: uppercase;
      color: var(--at-text-muted);
    }
    .field__error {
      font-size: var(--at-fs-sm);
      color: var(--at-danger);
      padding: var(--at-s1) var(--at-s2);
      background: var(--at-err-bg);
      margin-bottom: var(--at-s2);
    }

    @media (max-width: 768px) {
      .split {
        grid-template-columns: 1fr;
      }
      .page-head {
        grid-template-columns: 1fr;
      }
      .meta-grid {
        grid-template-columns: 1fr;
      }
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

  /** Derives 2 initials from a username (first letter of the prefix + first letter after the dot, if any). */
  protected initialsOf(name: string | null | undefined): string {
    if (!name) return '··';
    const trimmed = name.trim();
    if (trimmed === '') return '··';
    const parts = trimmed.split(/[._\s-]+/).filter((p) => p.length > 0);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  }

  protected readonly aiSummaryLoading = signal(false);
  protected readonly aiSummaryError = signal<string | null>(null);
  protected readonly aiSummary = signal<AiSummaryResponse | null>(null);

  protected readonly catalogWarning = signal<string | null>(null);
  protected readonly noteSubmitting = signal(false);

  // Per-action error signals (UV-8 AC5) — each action owns its error scope.
  protected readonly classifyError = signal<string | null>(null);
  protected readonly prioritizeError = signal<string | null>(null);
  protected readonly assignError = signal<string | null>(null);
  protected readonly attendError = signal<string | null>(null);
  protected readonly closeError = signal<string | null>(null);
  protected readonly cancelError = signal<string | null>(null);
  protected readonly rejectError = signal<string | null>(null);

  protected readonly priorityOptions: PriorityEnum[] = ['HIGH', 'MEDIUM', 'LOW'];

  /** Exposes the assignment hint constant to the template (UV-8 AC6). */
  protected readonly assignStaffHint = ASSIGN_STAFF_HINT;

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

    const role = this.session.role();
    if (role !== 'STAFF' && role !== 'ADMIN') {
      return false;
    }

    return !isTerminalStatus(d.status) && d.priority === null;
  });

  /** GET /ai/summarize/{requestId} → STAFF, ADMIN (OpenAPI contract). */
  protected readonly canSummarizeAiRole = computed(() => {
    const r = this.session.role();
    return r === 'STAFF' || r === 'ADMIN';
  });

  protected readonly requestTypesWithId = computed(() =>
    this.requestTypes().filter(
      (t): t is RequestTypeResponse & { id: number } => typeof t.id === 'number',
    ),
  );

  // ── Per-action field error computed helpers (UV-8 AC5) ───────────────────

  /** Returns the first error message for classifyForm.requestTypeId, or null. */
  protected readonly firstClassifyRequestTypeIdError = computed<string | null>(() => {
    const ctrl = this.classifyForm.controls.requestTypeId;
    if (!ctrl.touched || !ctrl.errors) return null;
    const [key, value] = Object.entries(ctrl.errors)[0];
    return messageFor(key, value);
  });

  /** Returns the first error message for classifyForm.observations, or null. */
  protected readonly firstClassifyObservationsError = computed<string | null>(() => {
    const ctrl = this.classifyForm.controls.observations;
    if (!ctrl.touched || !ctrl.errors) return null;
    const [key, value] = Object.entries(ctrl.errors)[0];
    return messageFor(key, value);
  });

  /** Returns the first error message for prioritizeForm.justification, or null. */
  protected readonly firstPrioritizeJustificationError = computed<string | null>(() => {
    const ctrl = this.prioritizeForm.controls.justification;
    if (!ctrl.touched || !ctrl.errors) return null;
    const [key, value] = Object.entries(ctrl.errors)[0];
    return messageFor(key, value);
  });

  /** Returns the first error message for assignForm.assignedToUserId, or null. */
  protected readonly firstAssignUserIdError = computed<string | null>(() => {
    const ctrl = this.assignForm.controls.assignedToUserId;
    if (!ctrl.touched || !ctrl.errors) return null;
    const [key, value] = Object.entries(ctrl.errors)[0];
    return messageFor(key, value);
  });

  /** Returns the first error message for attendForm.observations, or null. */
  protected readonly firstAttendObservationsError = computed<string | null>(() => {
    const ctrl = this.attendForm.controls.observations;
    if (!ctrl.touched || !ctrl.errors) return null;
    const [key, value] = Object.entries(ctrl.errors)[0];
    return messageFor(key, value);
  });

  /** Returns the first error message for closeForm.closingObservation, or null. */
  protected readonly firstCloseObservationError = computed<string | null>(() => {
    const ctrl = this.closeForm.controls.closingObservation;
    if (!ctrl.touched || !ctrl.errors) return null;
    const [key, value] = Object.entries(ctrl.errors)[0];
    return messageFor(key, value);
  });

  /** Returns the first error message for cancelForm.cancellationReason, or null. */
  protected readonly firstCancelReasonError = computed<string | null>(() => {
    const ctrl = this.cancelForm.controls.cancellationReason;
    if (!ctrl.touched || !ctrl.errors) return null;
    const [key, value] = Object.entries(ctrl.errors)[0];
    return messageFor(key, value);
  });

  /** Returns the first error message for rejectForm.rejectionReason, or null. */
  protected readonly firstRejectReasonError = computed<string | null>(() => {
    const ctrl = this.rejectForm.controls.rejectionReason;
    if (!ctrl.touched || !ctrl.errors) return null;
    const [key, value] = Object.entries(ctrl.errors)[0];
    return messageFor(key, value);
  });

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
      this.noteForm.markAllAsTouched();
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
    if (this.classifyForm.invalid) {
      this.classifyForm.markAllAsTouched();
      return;
    }
    const v = this.classifyForm.getRawValue();
    if (v.requestTypeId === null) {
      return;
    }
    clearServerErrors(this.classifyForm);
    this.classifyError.set(null);
    this.actionBusy.set(true);
    this.api
      .classifyRequest(this.requestId, {
        requestTypeId: v.requestTypeId,
        observations: v.observations === '' ? undefined : v.observations,
      })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          const { remainingGlobal } = applyProblemToForm(
            p,
            this.classifyForm,
            CLASSIFY_CONTROL_ID_MAP,
          );
          this.classifyError.set(
            remainingGlobal[0]?.message ??
              p?.detail ??
              p?.title ??
              'No pudimos completar la acción. Inténtalo de nuevo.',
          );
          return EMPTY;
        }),
        finalize(() => this.actionBusy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.reload());
  }

  protected submitPrioritize(): void {
    if (this.prioritizeForm.invalid) {
      this.prioritizeForm.markAllAsTouched();
      return;
    }
    const v = this.prioritizeForm.getRawValue();
    if (v.priority === null) {
      return;
    }
    clearServerErrors(this.prioritizeForm);
    this.prioritizeError.set(null);
    this.actionBusy.set(true);
    this.api
      .prioritizeRequest(this.requestId, {
        priority: v.priority,
        justification: v.justification,
      })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          const { remainingGlobal } = applyProblemToForm(
            p,
            this.prioritizeForm,
            PRIORITIZE_CONTROL_ID_MAP,
          );
          this.prioritizeError.set(
            remainingGlobal[0]?.message ??
              p?.detail ??
              p?.title ??
              'No pudimos completar la acción. Inténtalo de nuevo.',
          );
          return EMPTY;
        }),
        finalize(() => this.actionBusy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.reload());
  }

  protected submitAssign(): void {
    if (this.assignForm.invalid) {
      this.assignForm.markAllAsTouched();
      return;
    }
    const v = this.assignForm.getRawValue();
    if (v.assignedToUserId === null) {
      return;
    }
    clearServerErrors(this.assignForm);
    this.assignError.set(null);
    this.actionBusy.set(true);
    this.api
      .assignRequest(this.requestId, {
        assignedToUserId: v.assignedToUserId,
        observations: v.observations === '' ? undefined : v.observations,
      })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          const { remainingGlobal } = applyProblemToForm(p, this.assignForm, ASSIGN_CONTROL_ID_MAP);
          // For 404 or "not found" responses: show the recovery guidance copy (UV-8 AC6).
          const backendMsg = remainingGlobal[0]?.message ?? p?.detail ?? p?.title;
          const isNotFound =
            err.status === 404 ||
            (typeof backendMsg === 'string' && /no encontrado|not found/i.test(backendMsg));
          this.assignError.set(
            isNotFound
              ? ASSIGN_NOT_FOUND_MSG
              : (backendMsg ?? 'No pudimos completar la acción. Inténtalo de nuevo.'),
          );
          return EMPTY;
        }),
        finalize(() => this.actionBusy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.reload());
  }

  protected submitAttend(): void {
    if (this.attendForm.invalid) {
      this.attendForm.markAllAsTouched();
      return;
    }
    clearServerErrors(this.attendForm);
    this.attendError.set(null);
    this.actionBusy.set(true);
    this.api
      .attendRequest(this.requestId, this.attendForm.getRawValue())
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          const { remainingGlobal } = applyProblemToForm(p, this.attendForm, ATTEND_CONTROL_ID_MAP);
          this.attendError.set(
            remainingGlobal[0]?.message ??
              p?.detail ??
              p?.title ??
              'No pudimos completar la acción. Inténtalo de nuevo.',
          );
          return EMPTY;
        }),
        finalize(() => this.actionBusy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.reload());
  }

  protected submitClose(): void {
    if (this.closeForm.invalid) {
      this.closeForm.markAllAsTouched();
      return;
    }
    clearServerErrors(this.closeForm);
    this.closeError.set(null);
    this.actionBusy.set(true);
    this.api
      .closeRequest(this.requestId, this.closeForm.getRawValue())
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          const { remainingGlobal } = applyProblemToForm(p, this.closeForm, CLOSE_CONTROL_ID_MAP);
          this.closeError.set(
            remainingGlobal[0]?.message ??
              p?.detail ??
              p?.title ??
              'No pudimos completar la acción. Inténtalo de nuevo.',
          );
          return EMPTY;
        }),
        finalize(() => this.actionBusy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.reload());
  }

  protected submitCancel(): void {
    if (this.cancelForm.invalid) {
      this.cancelForm.markAllAsTouched();
      return;
    }
    clearServerErrors(this.cancelForm);
    this.cancelError.set(null);
    this.actionBusy.set(true);
    this.api
      .cancelRequest(this.requestId, this.cancelForm.getRawValue())
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          const { remainingGlobal } = applyProblemToForm(p, this.cancelForm, CANCEL_CONTROL_ID_MAP);
          this.cancelError.set(
            remainingGlobal[0]?.message ??
              p?.detail ??
              p?.title ??
              'No pudimos completar la acción. Inténtalo de nuevo.',
          );
          return EMPTY;
        }),
        finalize(() => this.actionBusy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.reload());
  }

  protected submitReject(): void {
    if (this.rejectForm.invalid) {
      this.rejectForm.markAllAsTouched();
      return;
    }
    clearServerErrors(this.rejectForm);
    this.rejectError.set(null);
    this.actionBusy.set(true);
    this.api
      .rejectRequest(this.requestId, this.rejectForm.getRawValue())
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          const { remainingGlobal } = applyProblemToForm(p, this.rejectForm, REJECT_CONTROL_ID_MAP);
          this.rejectError.set(
            remainingGlobal[0]?.message ??
              p?.detail ??
              p?.title ??
              'No pudimos completar la acción. Inténtalo de nuevo.',
          );
          return EMPTY;
        }),
        finalize(() => this.actionBusy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.reload());
  }

  private mapErr(err: HttpErrorResponse): string {
    const p = this.problemMapper.fromHttpError(err);
    return p?.detail ?? p?.title ?? 'No pudimos completar la acción. Inténtalo de nuevo.';
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
