/**
 * View model para la fila de la lista de reglas de negocio.
 *
 * El DTO `BusinessRuleResponse` expone:
 * - `conditionType`: enum técnico inglés ('REQUEST_TYPE', 'DEADLINE', …)
 * - `conditionValue`: string opaco (puede ser un ID o un número de días)
 * - `requestType`: objeto anidado opcional (`{ id?, name? }`)
 * - `resultingPriority`: enum inglés ('HIGH', 'MEDIUM', 'LOW')
 *
 * El view model resuelve todo esto en campos de display directos.
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

/** View model de una fila en el listado de reglas de negocio. */
export interface BusinessRuleListItemView {
  id: number;
  name: string;

  /** Enums crudos — necesarios para filtros y lógica de acciones. */
  conditionType: ConditionTypeEnum;
  resultingPriority: PriorityEnum;
  active: boolean;

  /** Etiqueta legible del tipo de condición. */
  conditionLabel: string;
  /**
   * Detalle de la condición resuelto según el tipo:
   * - REQUEST_TYPE → nombre del tipo de solicitud
   * - DEADLINE → "N días"
   * - REQUEST_TYPE_AND_DEADLINE → "Nombre tipo + N días"
   */
  conditionDetail: string;
  /** requestType.name aplanado con fallback. */
  typeName: string;
  /** Etiqueta en español de la prioridad resultante. */
  priorityLabel: string;
}
