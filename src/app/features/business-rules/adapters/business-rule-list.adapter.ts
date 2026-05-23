import type { BusinessRuleResponse, ConditionTypeEnum } from '../models/business-rule.types';
import {
  CONDITION_TYPE_LABELS,
  PRIORITY_LABELS,
  type BusinessRuleListItemView,
} from '../models/business-rule-list-view';

/**
 * Builds the `conditionDetail` field based on the condition type.
 *
 * The semantics of `conditionValue` vary by `conditionType`:
 * - REQUEST_TYPE            → `conditionValue` is the id string; we display the type name.
 * - DEADLINE                → `conditionValue` is the number of days.
 * - REQUEST_TYPE_AND_DEADLINE → `conditionValue` is days; type comes from `requestType`.
 */
function buildConditionDetail(raw: BusinessRuleResponse): string {
  const ct: ConditionTypeEnum = raw.conditionType ?? 'REQUEST_TYPE';
  const cv = raw.conditionValue;
  const typeName = raw.requestType?.name;

  switch (ct) {
    case 'REQUEST_TYPE':
      return typeName ?? cv ?? '—';

    case 'DEADLINE':
      return cv !== undefined ? `${cv} días` : '—';

    case 'REQUEST_TYPE_AND_DEADLINE': {
      const parts: string[] = [];
      if (typeName !== undefined) {
        parts.push(typeName);
      }
      if (cv !== undefined) {
        parts.push(`${cv} días`);
      }
      return parts.length > 0 ? parts.join(' + ') : '—';
    }
  }
}

/**
 * Converts `BusinessRuleResponse` (HTTP DTO) to `BusinessRuleListItemView`.
 *
 * Responsibilities:
 * - Resolves technical English enums to display labels.
 * - Builds a semantic `conditionDetail` instead of the opaque `conditionValue`.
 * - Flattens `requestType?.name` with a fallback.
 */
export function adaptBusinessRuleListItem(raw: BusinessRuleResponse): BusinessRuleListItemView {
  const conditionType: ConditionTypeEnum = raw.conditionType ?? 'REQUEST_TYPE';
  const resultingPriority = raw.resultingPriority ?? 'LOW';

  return {
    id: raw.id ?? 0,
    name: raw.name ?? '',
    conditionType,
    resultingPriority,
    active: raw.active ?? false,
    conditionLabel: CONDITION_TYPE_LABELS[conditionType],
    conditionDetail: buildConditionDetail(raw),
    typeName: raw.requestType?.name ?? '—',
    priorityLabel: PRIORITY_LABELS[resultingPriority],
  };
}
