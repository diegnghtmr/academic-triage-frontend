import type { HistoryEntryResponse, RequestDetailResponse } from '../models/request-api.types';
import type { HistoryEntryView, RequestDetailView } from '../models/request-detail-view';

import { formatDisplayLabel, formatUsernameLabel } from '@shared/utils/display-format';

function formatPersonName(
  person:
    | {
        firstName?: string;
        lastName?: string;
        username?: string;
      }
    | null
    | undefined,
): string {
  if (person === null || person === undefined) {
    return '—';
  }

  const firstName = person.firstName?.trim() ?? '';
  const lastName = person.lastName?.trim() ?? '';
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName !== '') {
    return fullName;
  }

  return formatUsernameLabel(person.username);
}

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
    statusLabel: formatDisplayLabel(status, 'requestStatus'),
    priorityLabel: priority !== null ? formatDisplayLabel(priority, 'priority') : null,
    description: raw.description ?? '',
    registrationDateTime: raw.registrationDateTime ?? '',
    deadline: raw.deadline ?? null,
    typeName: raw.requestType?.name ?? '—',
    channelName: raw.originChannel?.name ?? '—',
    requesterName: formatPersonName(raw.requester),
    assignedToName: raw.assignedTo !== undefined ? formatPersonName(raw.assignedTo) : null,
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
    performedByName:
      raw.performedBy !== undefined ? formatPersonName(raw.performedBy) : '(sistema)',
  };
}
