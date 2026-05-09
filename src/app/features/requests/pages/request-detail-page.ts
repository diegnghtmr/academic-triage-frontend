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
                <span class="page-head__chip-value" [title]="d.channelName">{{ d.channelName }}</span>
              </li>
              <li class="page-head__chip">
                <span class="page-head__chip-label">Registrado</span>
                <span class="page-head__chip-value">{{ d.registrationDateTime | dateTimeLabel }}</span>
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
                <span class="avatar" [attr.data-initials]="initialsOf(d.requesterName)" aria-hidden="true"></span>
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
                  <span class="avatar" [attr.data-initials]="initialsOf(d.assignedToName)" aria-hidden="true"></span>
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
                  Recomendación según reglas vigentes para este tipo. No cambia la solicitud por sí sola.
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
                    <strong>Prioridad recomendada:</strong>
                    {{ s.suggestedPriority | displayLabel: 'priority' }}
                  </p>
                  @if (s.matchedRules?.length) {
                    <ul class="rules-list">
                      @for (m of s.matchedRules; track (m.ruleId ?? $index)) {
                        <li class="rules-list__item">
                          <span class="rules-list__name">{{ m.name }}</span>
                          <span class="rules-list__priority">{{ m.resultingPriority | displayLabel: 'priority' }}</span>
                        </li>
                      }
                    </ul>
                  } @else {
                    <p class="card__hint">No hay una regla específica para este caso.</p>
                  }
                }
              </section>
            }

            <!-- Resumen IA: solo STAFF y ADMIN (contrato: GET /ai/summarize → STAFF, ADMIN) -->
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
                  IA para resumir estado e historial. Ayuda de lectura — no reemplaza la información oficial.
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
    .section { padding: var(--at-s6); max-width: 1200px; margin: 0 auto; }
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
    .section__back:hover { color: var(--at-mercury); }

    .page-head {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: var(--at-s4);
      align-items: start;
      margin-bottom: var(--at-s5);
    }
    .page-head__title-block { min-width: 0; }
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

    .section__loading { color: var(--at-text-muted); font-family: var(--at-font-mono); }
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
    .card__header .card__title { margin: 0; }
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
    .meta-grid__cell { display: flex; flex-direction: column; gap: var(--at-s2); }
    .meta-grid__cell dt {
      margin: 0;
      font-family: var(--at-font-mono);
      font-size: var(--at-fs-xs);
      letter-spacing: var(--at-tracking-wide);
      text-transform: uppercase;
      color: var(--at-text-muted);
    }
    .meta-grid__cell dd { margin: 0; color: var(--at-text); }
    .meta-grid__id {
      font-family: var(--at-font-mono);
      color: var(--at-text-muted);
    }
    .meta-grid__empty { color: var(--at-text-dim); }

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
    .party-card__body { display: flex; align-items: center; gap: var(--at-s3); }
    .party-card__id { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
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
      background:
        repeating-linear-gradient(
          45deg,
          var(--at-surface-2) 0 2px,
          var(--at-bg) 2px 4px
        );
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
    .rules-list__item:first-child { border-top: 0; padding-top: 0; }
    .rules-list__name { color: var(--at-text); }
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
    .card__value { margin: var(--at-s3) 0; }
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

    .field { display: flex; flex-direction: column; gap: var(--at-s2); }
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
      .split { grid-template-columns: 1fr; }
      .page-head { grid-template-columns: 1fr; }
      .meta-grid { grid-template-columns: 1fr; }
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

  /** Genera 2 letras a partir del username (primera letra del prefijo + primera letra después del punto, si hay). */
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

    const role = this.session.role();
    if (role !== 'STAFF' && role !== 'ADMIN') {
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
