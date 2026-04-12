import type { BusinessRuleResponse, ConditionTypeEnum } from '../models/business-rule.types';
import {
  CONDITION_TYPE_LABELS,
  PRIORITY_LABELS,
  type BusinessRuleListItemView,
} from '../models/business-rule-list-view';

/**
 * Construye el campo `conditionDetail` según el tipo de condición.
 *
 * La semántica de `conditionValue` varía por `conditionType`:
 * - REQUEST_TYPE            → `conditionValue` es el id string; mostramos el nombre del tipo.
 * - DEADLINE                → `conditionValue` es el número de días.
 * - REQUEST_TYPE_AND_DEADLINE → `conditionValue` es días; tipo viene en `requestType`.
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
 * Convierte `BusinessRuleResponse` (DTO HTTP) a `BusinessRuleListItemView`.
 *
 * Responsabilidades:
 * - Resuelve enums técnicos ingleses a etiquetas en español.
 * - Construye `conditionDetail` semántico en lugar del opaco `conditionValue`.
 * - Aplana `requestType?.name` con fallback.
 */
export function adaptBusinessRuleListItem(
  raw: BusinessRuleResponse,
): BusinessRuleListItemView {
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
