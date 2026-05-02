import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize } from 'rxjs';

import { ProblemErrorMapper } from '@core/http/problem-error.mapper';
import { DisplayLabelPipe } from '@shared/pipes/display-label.pipe';
import { CatalogAdminApiService } from '@features/catalogs/data-access/catalog-admin-api.service';
import type { RequestTypeResponse } from '@features/catalogs/models/catalog-admin.types';

import { BusinessRulesApiService } from '../data-access/business-rules-api.service';
import type {
  BusinessRuleFormValue,
  ConditionTypeEnum,
  CreateBusinessRuleBody,
  PriorityEnum,
  UpdateBusinessRuleBody,
} from '../models/business-rule.types';
import { CONDITION_TYPE_OPTIONS, PRIORITY_OPTIONS } from '../models/business-rule.types';

/**
 * Formulario de creación y edición de reglas de negocio.
 *
 * La visibilidad de campos depende de `conditionType`:
 *
 * | conditionType              | deadlineDays | requestTypeId |
 * |----------------------------|--------------|---------------|
 * | REQUEST_TYPE               | oculto       | requerido     |
 * | DEADLINE                   | requerido    | oculto        |
 * | REQUEST_TYPE_AND_DEADLINE  | requerido    | requerido     |
 *
 * Al enviar, `conditionValue` se deriva del estado del formulario:
 * - REQUEST_TYPE:            String(requestTypeId)
 * - DEADLINE:                String(deadlineDays)
 * - REQUEST_TYPE_AND_DEADLINE: String(deadlineDays)
 */
@Component({
  selector: 'at-business-rule-form-page',
  imports: [ReactiveFormsModule, RouterLink, DisplayLabelPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section">
      <h2 class="section__title">{{ isEdit() ? 'Editar regla de negocio' : 'Nueva regla de negocio' }}</h2>
      <p class="section__back"><a routerLink="/app/business-rules">← Volver al listado</a></p>

      @if (loadError()) {
        <p class="field__error" role="alert">{{ loadError() }}</p>
      } @else {
        <div class="card">
          <form class="edit-form" [formGroup]="form" (ngSubmit)="submit()">
            <!-- Nombre -->
            <div class="field">
              <label class="field__label" for="br-name">Nombre <span aria-hidden="true">*</span></label>
              <input
                class="input"
                id="br-name"
                type="text"
                formControlName="name"
                maxlength="150"
                autocomplete="off"
              />
              @if (form.controls.name.invalid && form.controls.name.touched) {
                <span class="field__error" role="alert">El nombre es requerido (máx. 150 caracteres).</span>
              }
            </div>

            <!-- Descripción -->
            <div class="field">
              <label class="field__label" for="br-desc">Descripción</label>
              <textarea
                class="input"
                id="br-desc"
                rows="3"
                formControlName="description"
                maxlength="500"
              ></textarea>
              @if (form.controls.description.invalid && form.controls.description.touched) {
                <span class="field__error" role="alert">Máximo 500 caracteres.</span>
              }
            </div>

            <!-- Tipo de condición -->
            <div class="field">
              <label class="field__label" for="br-ctype">Tipo de condición <span aria-hidden="true">*</span></label>
              <select class="input" id="br-ctype" formControlName="conditionType">
                @for (opt of conditionTypeOptions; track opt) {
                  <option [value]="opt">{{ conditionTypeLabel(opt) }}</option>
                }
              </select>
            </div>

            <!-- Días límite: DEADLINE y REQUEST_TYPE_AND_DEADLINE -->
            @if (showDeadlineDays()) {
              <div class="field">
                <label class="field__label" for="br-days">
                  Días límite <span aria-hidden="true">*</span>
                  <small>(número entero no negativo)</small>
                </label>
                <input class="input" id="br-days" type="number" min="0" step="1" formControlName="deadlineDays" />
                @if (form.controls.deadlineDays.invalid && form.controls.deadlineDays.touched) {
                  <span class="field__error" role="alert">Ingrese un número entero mayor o igual a 0.</span>
                }
              </div>
            }

            <!-- Tipo de solicitud: REQUEST_TYPE y REQUEST_TYPE_AND_DEADLINE -->
            @if (showRequestTypeSelector()) {
              <div class="field">
                <label class="field__label" for="br-rtype"> Tipo de solicitud <span aria-hidden="true">*</span> </label>
                @if (catalogLoading()) {
                  <p class="field__hint">Cargando tipos…</p>
                } @else {
                  <select class="input" id="br-rtype" formControlName="requestTypeId">
                    <option [ngValue]="null">Seleccionar…</option>
                    @for (rt of requestTypes(); track rt.id) {
                      <option [ngValue]="rt.id">{{ rt.name }}</option>
                    }
                  </select>
                }
                @if (catalogError() !== null) {
                  <p class="field__error" role="alert">{{ catalogError() }}</p>
                }
                @if (form.controls.requestTypeId.invalid && form.controls.requestTypeId.touched) {
                  <span class="field__error" role="alert">Seleccione un tipo de solicitud.</span>
                }
              </div>
            }

            <!-- Prioridad resultante -->
            <div class="field">
              <label class="field__label" for="br-priority">Prioridad resultante <span aria-hidden="true">*</span></label>
              <select class="input" id="br-priority" formControlName="resultingPriority">
                @for (p of priorityOptions; track p) {
                  <option [value]="p">{{ p | displayLabel: 'priority' }}</option>
                }
              </select>
            </div>

            <!-- Estado activo: solo en edición (UpdateBusinessRuleBody lo requiere) -->
            @if (isEdit()) {
              <div class="field field--checkbox">
                <label class="field__checkbox-label">
                  <input type="checkbox" formControlName="active" />
                  <span>Activa</span>
                </label>
              </div>
            }

            @if (submitError()) {
              <p class="field__error" role="alert">{{ submitError() }}</p>
            }

            <button class="btn btn--primary" type="submit" [disabled]="form.invalid || submitting() || loadingItem()">
              @if (submitting()) {
                Guardando…
              } @else {
                {{ isEdit() ? 'Guardar cambios' : 'Crear' }}
              }
            </button>
          </form>
        </div>
      }
    </section>
  `,
  styles: `
    .section { padding: var(--at-s6); max-width: 600px; }
    .section__title { font-size: var(--at-fs-xl); font-weight: 800; letter-spacing: var(--at-tracking-tight); margin-bottom: var(--at-s2); }
    .section__back { margin-bottom: var(--at-s4); font-size: var(--at-fs-sm); }
    .card { background: var(--at-surface); border: 1px solid var(--at-border); padding: var(--at-s5); }
    .edit-form { display: flex; flex-direction: column; gap: var(--at-s3); }
    .field { display: flex; flex-direction: column; gap: var(--at-s1); }
    .field__label { font-size: var(--at-fs-sm); color: var(--at-text-muted); font-family: var(--at-font-mono); }
    .field__hint { font-size: var(--at-fs-sm); color: var(--at-text-muted); }
    .field__error { font-size: var(--at-fs-sm); color: var(--at-danger); padding: var(--at-s1) var(--at-s2); background: var(--at-err-bg); }
    .field--checkbox .field__checkbox-label { display: flex; align-items: center; gap: var(--at-s2); font-size: var(--at-fs-sm); color: var(--at-text-muted); cursor: pointer; }
  `,
})
export class BusinessRuleFormPage {
  private readonly api = inject(BusinessRulesApiService);
  private readonly catalogApi = inject(CatalogAdminApiService);
  private readonly problemMapper = inject(ProblemErrorMapper);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly conditionTypeOptions = CONDITION_TYPE_OPTIONS;
  protected readonly priorityOptions = PRIORITY_OPTIONS;

  protected readonly loadingItem = signal(false);
  protected readonly catalogLoading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitError = signal<string | null>(null);
  protected readonly catalogError = signal<string | null>(null);
  protected readonly requestTypes = signal<RequestTypeResponse[]>([]);

  private readonly ruleId = signal<number | null>(null);
  protected readonly isEdit = computed(() => this.ruleId() !== null);

  protected readonly form = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(150)]),
    description: this.fb.nonNullable.control('', [Validators.maxLength(500)]),
    conditionType: this.fb.nonNullable.control<ConditionTypeEnum>(
      'REQUEST_TYPE',
      Validators.required,
    ),
    deadlineDays: this.fb.control<number | null>(null),
    requestTypeId: this.fb.control<number | null>(null),
    resultingPriority: this.fb.nonNullable.control<PriorityEnum>('HIGH', Validators.required),
    active: this.fb.nonNullable.control(true),
  });

  /** Señal reactiva sobre el valor actual de conditionType en el formulario. */
  private readonly selectedConditionType = toSignal(this.form.controls.conditionType.valueChanges, {
    initialValue: this.form.controls.conditionType.value,
  });

  protected readonly showDeadlineDays = computed(() => {
    const ct = this.selectedConditionType();
    return ct === 'DEADLINE' || ct === 'REQUEST_TYPE_AND_DEADLINE';
  });

  protected readonly showRequestTypeSelector = computed(() => {
    const ct = this.selectedConditionType();
    return ct === 'REQUEST_TYPE' || ct === 'REQUEST_TYPE_AND_DEADLINE';
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null) {
      const parsed = Number(idParam);
      if (!Number.isNaN(parsed)) {
        this.ruleId.set(parsed);
        this.loadItem(parsed);
      }
    }
    this.loadCatalog();
  }

  protected conditionTypeLabel(ct: ConditionTypeEnum): string {
    const labels: Record<ConditionTypeEnum, string> = {
      REQUEST_TYPE: 'Por tipo de solicitud',
      DEADLINE: 'Por días hasta vencimiento',
      REQUEST_TYPE_AND_DEADLINE: 'Por tipo de solicitud y días hasta vencimiento',
    };
    return labels[ct];
  }

  private loadCatalog(): void {
    this.catalogLoading.set(true);
    this.catalogError.set(null);
    this.catalogApi
      .listRequestTypes(true)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          this.catalogError.set(
            p?.detail ?? p?.title ?? 'No pudimos cargar los tipos de solicitud.',
          );
          return EMPTY;
        }),
        finalize(() => this.catalogLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({ next: (data) => this.requestTypes.set(data) });
  }

  private loadItem(id: number): void {
    this.loadingItem.set(true);
    this.api
      .getById(id)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const p = this.problemMapper.fromHttpError(err);
          this.loadError.set(p?.detail ?? p?.title ?? 'No pudimos cargar la regla de negocio.');
          return EMPTY;
        }),
        finalize(() => this.loadingItem.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((rule) => {
        const ct: ConditionTypeEnum = rule.conditionType ?? 'REQUEST_TYPE';

        let deadlineDays: number | null = null;
        let requestTypeId: number | null = null;

        if (ct === 'DEADLINE') {
          deadlineDays = rule.conditionValue !== undefined ? Number(rule.conditionValue) : null;
        } else if (ct === 'REQUEST_TYPE') {
          requestTypeId = rule.requestType?.id ?? null;
        } else {
          // REQUEST_TYPE_AND_DEADLINE
          deadlineDays = rule.conditionValue !== undefined ? Number(rule.conditionValue) : null;
          requestTypeId = rule.requestType?.id ?? null;
        }

        this.form.setValue({
          name: rule.name ?? '',
          description: rule.description ?? '',
          conditionType: ct,
          deadlineDays,
          requestTypeId,
          resultingPriority: rule.resultingPriority ?? 'HIGH',
          active: rule.active ?? true,
        });
      });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue() as BusinessRuleFormValue;
    const conditionType = v.conditionType;

    let conditionValue: string;
    let requestTypeId: number | null;

    switch (conditionType) {
      case 'REQUEST_TYPE':
        if (v.requestTypeId === null) {
          this.submitError.set('Elegí un tipo de solicitud para completar esta condición.');
          return;
        }
        conditionValue = String(v.requestTypeId);
        requestTypeId = v.requestTypeId;
        break;

      case 'DEADLINE':
        if (v.deadlineDays === null || v.deadlineDays < 0) {
          this.submitError.set('Ingresá una cantidad de días válida (0 o mayor).');
          return;
        }
        conditionValue = String(Math.trunc(v.deadlineDays));
        requestTypeId = null;
        break;

      case 'REQUEST_TYPE_AND_DEADLINE':
        if (v.requestTypeId === null) {
          this.submitError.set('Elegí un tipo de solicitud para completar esta condición.');
          return;
        }
        if (v.deadlineDays === null || v.deadlineDays < 0) {
          this.submitError.set('Ingresá una cantidad de días válida (0 o mayor).');
          return;
        }
        conditionValue = String(Math.trunc(v.deadlineDays));
        requestTypeId = v.requestTypeId;
        break;
    }

    this.submitError.set(null);
    this.submitting.set(true);

    const id = this.ruleId();

    if (id !== null) {
      const body: UpdateBusinessRuleBody = {
        name: v.name,
        conditionType,
        conditionValue,
        resultingPriority: v.resultingPriority,
        requestTypeId,
        active: v.active,
      };
      if (v.description.trim() !== '') {
        body.description = v.description.trim();
      }
      this.api
        .update(id, body)
        .pipe(
          catchError((err: HttpErrorResponse) => {
            const p = this.problemMapper.fromHttpError(err);
            this.submitError.set(
              p?.detail ?? p?.title ?? 'No pudimos actualizar la regla de negocio.',
            );
            return EMPTY;
          }),
          finalize(() => this.submitting.set(false)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe(() => {
          void this.router.navigate(['/app/business-rules']);
        });
    } else {
      const body: CreateBusinessRuleBody = {
        name: v.name,
        conditionType,
        conditionValue,
        resultingPriority: v.resultingPriority,
        requestTypeId,
      };
      if (v.description.trim() !== '') {
        body.description = v.description.trim();
      }
      this.api
        .create(body)
        .pipe(
          catchError((err: HttpErrorResponse) => {
            const p = this.problemMapper.fromHttpError(err);
            this.submitError.set(p?.detail ?? p?.title ?? 'No pudimos crear la regla de negocio.');
            return EMPTY;
          }),
          finalize(() => this.submitting.set(false)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe(() => {
          void this.router.navigate(['/app/business-rules']);
        });
    }
  }
}
