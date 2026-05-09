/**
 * DTOs aligned to `docs/openapi-academic-triage.yaml` — Business Rules section.
 *
 * Semantics of `conditionValue` per `conditionType`:
 *   REQUEST_TYPE            → decimal id string of the requestType (equals String(requestTypeId))
 *   DEADLINE                → days as a string (non-negative integer)
 *   REQUEST_TYPE_AND_DEADLINE → days as a string; requestType via requestTypeId
 *
 * `requestTypeId`:
 *   REQUEST_TYPE            → required
 *   DEADLINE                → must be null
 *   REQUEST_TYPE_AND_DEADLINE → required
 */

export type ConditionTypeEnum =
  | 'REQUEST_TYPE'
  | 'DEADLINE'
  | 'REQUEST_TYPE_AND_DEADLINE';

import type { PriorityEnum } from '@shared/models/priority';

export type { PriorityEnum } from '@shared/models/priority';
export { PRIORITY_OPTIONS } from '@shared/models/priority';

export const CONDITION_TYPE_OPTIONS: ConditionTypeEnum[] = [
  'REQUEST_TYPE',
  'DEADLINE',
  'REQUEST_TYPE_AND_DEADLINE',
];

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
 * `requestTypeId` is required for REQUEST_TYPE and REQUEST_TYPE_AND_DEADLINE;
 * must be null (or absent) for DEADLINE.
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
 * Identical to Create but adds `active` (required field in the contract).
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

/** Form view model: internal state before deriving `conditionValue`. */
export interface BusinessRuleFormValue {
  name: string;
  description: string;
  conditionType: ConditionTypeEnum;
  /** Days: applies for DEADLINE and REQUEST_TYPE_AND_DEADLINE. */
  deadlineDays: number | null;
  /** Type id: applies for REQUEST_TYPE and REQUEST_TYPE_AND_DEADLINE. */
  requestTypeId: number | null;
  resultingPriority: PriorityEnum;
  /** Edit mode only — required in UpdateBusinessRuleBody. */
  active: boolean;
}
