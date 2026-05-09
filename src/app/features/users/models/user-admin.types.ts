/**
 * DTOs for the users feature — aligned to `docs/openapi-academic-triage.yaml`.
 *
 * `UserResponse` is reused from `@core/auth/models/auth-api.types` (same contract).
 * `PagedResponse<T>` is reused from `@shared/models/page`.
 */

import type { RoleEnum } from '@core/auth/models/auth-api.types';

/**
 * PUT /users/{userId}
 * All fields are required per the contract.
 * `username` is not included here: it is not editable by ADMIN via this endpoint.
 */
export interface UpdateUserBody {
  firstName: string;
  lastName: string;
  identification: string;
  email: string;
  role: RoleEnum;
  active: boolean;
}

/** Optional query parameters for GET /users */
export interface ListUsersQueryParams {
  role?: RoleEnum;
  active?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}
