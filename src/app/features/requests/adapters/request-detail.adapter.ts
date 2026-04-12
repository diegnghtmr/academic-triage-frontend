import type { HistoryEntryResponse, RequestDetailResponse } from '../models/request-api.types';
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  type HistoryEntryView,
  type RequestDetailView,
} from '../models/request-detail-view';

/**
 * Convierte `RequestDetailResponse` (DTO HTTP) a `RequestDetailView`.
 *
 * Responsabilidades:
 * - Elimina todos los `undefined` opcionales del transporte.
 * - Aplana referencias anidadas (`requester.username` → `requesterName`).
 * - Genera etiquetas en español para los enums `status` y `priority`.
 * - Normaliza nulos explícitos donde la UI distingue ausencia de dato.
 */
export function adaptRequestDetail(raw: RequestDetailResponse): RequestDetailView {
  const status = raw.status ?? 'REGISTERED';
  const priority = raw.priority ?? null;

  return {
    id: raw.id ?? 0,
    status,
    priority,
    statusLabel: STATUS_LABELS[status],
    priorityLabel: priority !== null ? PRIORITY_LABELS[priority] : null,
    description: raw.description ?? '',
    registrationDateTime: raw.registrationDateTime ?? '',
    deadline: raw.deadline ?? null,
    typeName: raw.requestType?.name ?? '—',
    channelName: raw.originChannel?.name ?? '—',
    requesterName: raw.requester?.username ?? '—',
    assignedToName: raw.assignedTo?.username ?? null,
    requesterId: raw.requester?.id,
  };
}

/**
 * Convierte `HistoryEntryResponse` a `HistoryEntryView`.
 *
 * Aplana `performedBy.username` y normaliza valores ausentes.
 */
export function adaptHistoryEntry(raw: HistoryEntryResponse): HistoryEntryView {
  return {
    id: raw.id ?? 0,
    action: raw.action ?? '',
    observations: raw.observations ?? null,
    timestamp: raw.timestamp ?? '',
    performedByName: raw.performedBy?.username ?? '(sistema)',
  };
}
