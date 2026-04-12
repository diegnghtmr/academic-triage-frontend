/**
 * View models para la página de detalle de solicitud.
 *
 * Separa el shape de transporte HTTP (`RequestDetailResponse`) del shape
 * que la plantilla necesita:
 * - campos requeridos (sin `| undefined`)
 * - nullables explícitos donde realmente aplica (`null`, no `undefined`)
 * - etiquetas en español para enums de transporte
 * - referencias anidadas aplanadas (requester.username → requesterName)
 *
 * Los campos `status` y `priority` se preservan como enums crudos porque
 * los utilizan las funciones de visibilidad de acciones.
 */

import type { PriorityEnum, RequestStatusEnum } from './request-api.types';

export const STATUS_LABELS: Record<RequestStatusEnum, string> = {
  REGISTERED: 'Registrada',
  CLASSIFIED: 'Clasificada',
  IN_PROGRESS: 'En proceso',
  ATTENDED: 'Atendida',
  CLOSED: 'Cerrada',
  CANCELLED: 'Cancelada',
  REJECTED: 'Rechazada',
};

export const PRIORITY_LABELS: Record<PriorityEnum, string> = {
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
};

/** View model de la cabecera/resumen de una solicitud. */
export interface RequestDetailView {
  id: number;

  /** Enum crudo — necesario para funciones de visibilidad de acciones. */
  status: RequestStatusEnum;
  /** Enum crudo — necesario para funciones de visibilidad de acciones. */
  priority: PriorityEnum | null;

  /** Etiqueta en español del estado. */
  statusLabel: string;
  /** Etiqueta en español de la prioridad; null si aún no fue priorizada. */
  priorityLabel: string | null;

  description: string;
  registrationDateTime: string;
  deadline: string | null;

  /** requestType.name aplanado con fallback. */
  typeName: string;
  /** originChannel.name aplanado con fallback. */
  channelName: string;
  /** requester.username aplanado con fallback. */
  requesterName: string;
  /** assignedTo.username aplanado; null si no está asignada. */
  assignedToName: string | null;
  /** requester.id aplanado — necesario para validar cancelación propia. */
  requesterId: number | undefined;
}

/** View model de una entrada de historial. */
export interface HistoryEntryView {
  id: number;
  /** Acción tal como viene del backend (p.ej. "CLASSIFIED"). */
  action: string;
  observations: string | null;
  timestamp: string;
  /** performedBy.username aplanado con fallback. */
  performedByName: string;
}
