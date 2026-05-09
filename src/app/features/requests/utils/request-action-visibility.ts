import type { RoleEnum } from '@core/auth/models/auth-api.types';

import type { PriorityEnum, RequestStatusEnum } from '../models/request-api.types';

/**
 * Action enablement based **only** on OpenAPI descriptions (status + role).
 * The backend remains the definitive validator; this prevents obvious UI mistakes and does not replace business rules.
 */

export function isTerminalStatus(status: RequestStatusEnum | undefined): boolean {
  return (
    status === 'CLOSED' ||
    status === 'CANCELLED' ||
    status === 'REJECTED'
  );
}

/** PATCH .../classify — STAFF, precondition REGISTERED */
export function canShowClassify(
  role: RoleEnum | null,
  status: RequestStatusEnum | undefined,
): boolean {
  return role === 'STAFF' && status === 'REGISTERED';
}

/**
 * PATCH .../prioritize — STAFF, precondition CLASSIFIED.
 * If `priority` is already present in the response, prioritization is assumed applied (do not show again).
 */
export function canShowPrioritize(
  role: RoleEnum | null,
  status: RequestStatusEnum | undefined,
  priority: PriorityEnum | null | undefined,
): boolean {
  return (
    role === 'STAFF' &&
    status === 'CLASSIFIED' &&
    (priority === undefined || priority === null)
  );
}

/**
 * PATCH .../assign — STAFF, precondition CLASSIFIED already prioritised.
 * The presence of `priority` in the DTO is used as a signal aligned to the contract flow.
 */
export function canShowAssign(
  role: RoleEnum | null,
  status: RequestStatusEnum | undefined,
  priority: PriorityEnum | null | undefined,
): boolean {
  return (
    role === 'STAFF' &&
    status === 'CLASSIFIED' &&
    priority !== undefined &&
    priority !== null
  );
}

/** PATCH .../attend — STAFF, precondition IN_PROGRESS */
export function canShowAttend(
  role: RoleEnum | null,
  status: RequestStatusEnum | undefined,
): boolean {
  return role === 'STAFF' && status === 'IN_PROGRESS';
}

/** PATCH .../close — STAFF, precondition ATTENDED */
export function canShowClose(
  role: RoleEnum | null,
  status: RequestStatusEnum | undefined,
): boolean {
  return role === 'STAFF' && status === 'ATTENDED';
}

/**
 * PATCH .../cancel — STUDENT (owner), STAFF, ADMIN; precondition REGISTERED or CLASSIFIED.
 */
export function canShowCancel(
  role: RoleEnum | null,
  status: RequestStatusEnum | undefined,
  requesterUserId: number | undefined,
  currentUserId: number | undefined,
): boolean {
  if (status !== 'REGISTERED' && status !== 'CLASSIFIED') {
    return false;
  }
  if (role === 'STAFF' || role === 'ADMIN') {
    return true;
  }
  if (role === 'STUDENT') {
    return (
      requesterUserId !== undefined &&
      currentUserId !== undefined &&
      requesterUserId === currentUserId
    );
  }
  return false;
}

/** PATCH .../reject — ADMIN, precondition REGISTERED */
export function canShowReject(
  role: RoleEnum | null,
  status: RequestStatusEnum | undefined,
): boolean {
  return role === 'ADMIN' && status === 'REGISTERED';
}

/** POST .../history — STAFF */
export function canShowAddHistoryNote(role: RoleEnum | null): boolean {
  return role === 'STAFF';
}
