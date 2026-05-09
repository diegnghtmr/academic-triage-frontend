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
 * Converts `RequestDetailResponse` (HTTP DTO) to `RequestDetailView`.
 *
 * Responsibilities:
 * - Strips all optional `undefined` values from the transport shape.
 * - Flattens nested references (`requester.username` → `requesterName`).
 * - Builds display labels for the `status` and `priority` enums.
 * - Normalises explicit nulls where the UI distinguishes absence of data.
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
 * Converts `HistoryEntryResponse` to `HistoryEntryView`.
 *
 * Flattens `performedBy.username` and normalises missing values.
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
