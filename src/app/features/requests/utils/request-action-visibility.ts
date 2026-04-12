import type { RoleEnum } from '@core/auth/models/auth-api.types';

import type { PriorityEnum, RequestStatusEnum } from '../models/request-api.types';

/**
 * Habilitación de acciones basada **solo** en descripciones del OpenAPI (estado + rol).
 * El backend sigue siendo la validación definitiva; esto evita UI obvia y no sustituye reglas.
 */

export function isTerminalStatus(status: RequestStatusEnum | undefined): boolean {
  return (
    status === 'CLOSED' ||
    status === 'CANCELLED' ||
    status === 'REJECTED'
  );
}

/** PATCH .../classify — STAFF, precondición REGISTERED */
export function canShowClassify(
  role: RoleEnum | null,
  status: RequestStatusEnum | undefined,
): boolean {
  return role === 'STAFF' && status === 'REGISTERED';
}

/**
 * PATCH .../prioritize — STAFF, precondición CLASSIFIED.
 * Si `priority` ya viene en la respuesta, se asume priorización aplicada (no mostrar de nuevo).
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
 * PATCH .../assign — STAFF, precondición CLASSIFIED ya priorizada.
 * Usamos la presencia de `priority` en el DTO como señal alineada al flujo del contrato.
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

/** PATCH .../attend — STAFF, precondición IN_PROGRESS */
export function canShowAttend(
  role: RoleEnum | null,
  status: RequestStatusEnum | undefined,
): boolean {
  return role === 'STAFF' && status === 'IN_PROGRESS';
}

/** PATCH .../close — STAFF, precondición ATTENDED */
export function canShowClose(
  role: RoleEnum | null,
  status: RequestStatusEnum | undefined,
): boolean {
  return role === 'STAFF' && status === 'ATTENDED';
}

/**
 * PATCH .../cancel — STUDENT (dueño), STAFF, ADMIN; precondición REGISTERED o CLASSIFIED.
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

/** PATCH .../reject — ADMIN, precondición REGISTERED */
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
