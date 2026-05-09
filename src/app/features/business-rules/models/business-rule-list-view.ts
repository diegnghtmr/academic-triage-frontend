/**
 * View model for a row in the business rules list.
 *
 * The `BusinessRuleResponse` DTO exposes:
 * - `conditionType`: technical English enum ('REQUEST_TYPE', 'DEADLINE', …)
 * - `conditionValue`: opaque string (may be an ID or a number of days)
 * - `requestType`: optional nested object (`{ id?, name? }`)
 * - `resultingPriority`: English enum ('HIGH', 'MEDIUM', 'LOW')
 *
 * The view model resolves all of this into direct display fields.
 */

import type { ConditionTypeEnum, PriorityEnum } from './business-rule.types';

export const CONDITION_TYPE_LABELS: Record<ConditionTypeEnum, string> = {
  REQUEST_TYPE: 'Por tipo de solicitud',
  DEADLINE: 'Por días hasta vencimiento',
  REQUEST_TYPE_AND_DEADLINE: 'Por tipo y días',
};

export const PRIORITY_LABELS: Record<PriorityEnum, string> = {
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
};

/** View model for a row in the business rules list. */
export interface BusinessRuleListItemView {
  id: number;
  name: string;

  /** Raw enums — needed for filters and action logic. */
  conditionType: ConditionTypeEnum;
  resultingPriority: PriorityEnum;
  active: boolean;

  /** Human-readable label for the condition type. */
  conditionLabel: string;
  /**
   * Condition detail resolved by type:
   * - REQUEST_TYPE → name of the request type
   * - DEADLINE → "N días"
   * - REQUEST_TYPE_AND_DEADLINE → "Type name + N días"
   */
  conditionDetail: string;
  /** requestType.name flattened with fallback. */
  typeName: string;
  /** Display label for the resulting priority. */
  priorityLabel: string;
}
