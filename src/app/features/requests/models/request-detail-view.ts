/**
 * View models for the request detail page.
 *
 * Separates the HTTP transport shape (`RequestDetailResponse`) from the shape
 * the template needs:
 * - required fields (no `| undefined`)
 * - explicit nullables where they truly apply (`null`, not `undefined`)
 * - display labels for transport enums
 * - flattened nested references (requester.username → requesterName)
 *
 * The `status` and `priority` fields are preserved as raw enums because
 * action visibility functions consume them.
 */

import type { PriorityEnum, RequestStatusEnum } from './request-api.types';

/** View model de la cabecera/resumen de una solicitud. */
export interface RequestDetailView {
  id: number;

  /** Raw enum — needed by action visibility functions. */
  status: RequestStatusEnum;
  /** Raw enum — needed by action visibility functions. */
  priority: PriorityEnum | null;

  /** Display label for the status. */
  statusLabel: string;
  /** Display label for the priority; null if not yet prioritized. */
  priorityLabel: string | null;

  description: string;
  registrationDateTime: string;
  deadline: string | null;

  /** requestType.name flattened with fallback. */
  typeName: string;
  /** originChannel.name flattened with fallback. */
  channelName: string;
  /** requester.username flattened with fallback. */
  requesterName: string;
  /** assignedTo.username flattened; null if not assigned. */
  assignedToName: string | null;
  /** requester.id flattened — needed to validate own-request cancellation. */
  requesterId: number | undefined;
}

/** View model de una entrada de historial. */
export interface HistoryEntryView {
  id: number;
  /** Action as received from the backend (e.g. "CLASSIFIED"). */
  action: string;
  observations: string | null;
  timestamp: string;
  /** performedBy.username flattened with fallback. */
  performedByName: string;
}
