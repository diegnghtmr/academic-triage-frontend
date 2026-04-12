/**
 * DTOs de la feature users — alineados a `docs/openapi-academic-triage.yaml`.
 *
 * `UserResponse` se reutiliza de `@core/auth/models/auth-api.types` (mismo contrato).
 * `PagedResponse<T>` se reutiliza de `@shared/models/page`.
 */

import type { RoleEnum } from '@core/auth/models/auth-api.types';

/**
 * PUT /users/{userId}
 * Todos los campos son requeridos según el contrato.
 * `username` no aparece aquí: no es editable por el ADMIN vía este endpoint.
 */
export interface UpdateUserBody {
  firstName: string;
  lastName: string;
  identification: string;
  email: string;
  role: RoleEnum;
  active: boolean;
}

/** Parámetros opcionales de GET /users */
export interface ListUsersQueryParams {
  role?: RoleEnum;
  active?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}
