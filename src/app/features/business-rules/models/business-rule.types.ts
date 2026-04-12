/**
 * DTOs alineados a `docs/openapi-academic-triage.yaml` — sección Business Rules.
 *
 * Semántica de `conditionValue` por `conditionType`:
 *   REQUEST_TYPE            → decimal id string del requestType (igual a String(requestTypeId))
 *   DEADLINE                → días como string (entero no-negativo)
 *   REQUEST_TYPE_AND_DEADLINE → días como string; requestType vía requestTypeId
 *
 * `requestTypeId`:
 *   REQUEST_TYPE            → requerido
 *   DEADLINE                → debe ser null
 *   REQUEST_TYPE_AND_DEADLINE → requerido
 */

export type ConditionTypeEnum =
  | 'REQUEST_TYPE'
  | 'DEADLINE'
  | 'REQUEST_TYPE_AND_DEADLINE';

export type PriorityEnum = 'HIGH' | 'MEDIUM' | 'LOW';

export const CONDITION_TYPE_OPTIONS: ConditionTypeEnum[] = [
  'REQUEST_TYPE',
  'DEADLINE',
  'REQUEST_TYPE_AND_DEADLINE',
];

export const PRIORITY_OPTIONS: PriorityEnum[] = ['HIGH', 'MEDIUM', 'LOW'];

export interface BusinessRuleRequestTypeRef {
  id?: number;
  name?: string;
}

export interface BusinessRuleResponse {
  id?: number;
  name?: string;
  description?: string;
  conditionType?: ConditionTypeEnum;
  conditionValue?: string;
  resultingPriority?: PriorityEnum;
  requestType?: BusinessRuleRequestTypeRef | null;
  active?: boolean;
}

/**
 * POST /business-rules
 * `requestTypeId` es requerido para REQUEST_TYPE y REQUEST_TYPE_AND_DEADLINE;
 * debe ser null (o ausente) para DEADLINE.
 */
export interface CreateBusinessRuleBody {
  name: string;
  description?: string;
  conditionType: ConditionTypeEnum;
  conditionValue: string;
  resultingPriority: PriorityEnum;
  requestTypeId?: number | null;
}

/**
 * PUT /business-rules/{ruleId}
 * Idéntico a Create pero agrega `active` (campo requerido en el contrato).
 */
export interface UpdateBusinessRuleBody {
  name: string;
  description?: string;
  conditionType: ConditionTypeEnum;
  conditionValue: string;
  resultingPriority: PriorityEnum;
  requestTypeId?: number | null;
  active: boolean;
}

/** Vista del formulario: estado interno antes de derivar `conditionValue`. */
export interface BusinessRuleFormValue {
  name: string;
  description: string;
  conditionType: ConditionTypeEnum;
  /** Días: aplica para DEADLINE y REQUEST_TYPE_AND_DEADLINE. */
  deadlineDays: number | null;
  /** Id del tipo: aplica para REQUEST_TYPE y REQUEST_TYPE_AND_DEADLINE. */
  requestTypeId: number | null;
  resultingPriority: PriorityEnum;
  /** Solo edición — requerido en UpdateBusinessRuleBody. */
  active: boolean;
}
