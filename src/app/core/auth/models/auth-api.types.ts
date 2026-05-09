/**
 * DTOs aligned to `components/schemas` in the OpenAPI spec (`docs/openapi-academic-triage.yaml`).
 * Do not reuse legacy models (`shared/schema.ts`).
 */

/** `ROLE` const-object — source of truth for all role values. */
export const ROLE = {
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  STUDENT: 'STUDENT',
} as const;

/** `RoleEnum` — extracted union from `ROLE` const-object. */
export type RoleEnum = (typeof ROLE)[keyof typeof ROLE];

/**
 * `LoginRequest` — canonical login contract.
 *
 * **Canonical field**: `identifier` (accepts username or email address).
 * **Deprecated alias**: `username` is kept for backward compatibility only during
 * the transition window. It will be removed in a future version.
 *
 * Precedence rules (aligned with the backend):
 * - Only `identifier` → canonical path.
 * - Only `username` → alias path (deprecated).
 * - Both with the **same** value → accepted as canonical.
 * - Both with **different values** → 400 Bad Request (backend rejects without token).
 *
 * The frontend must send only `identifier` in new flows.
 * The `username` field is exposed here solely for compatibility tooling and tests.
 */
export interface LoginRequest {
  identifier: string;
  password: string;
  /** @deprecated Use `identifier`. Kept for backward-compatibility tooling and tests only. */
  username?: string;
}

/** `RegisterRequest` — `role` is only assignable by ADMIN with a token (not applicable to public registration). */
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  identification: string;
  role?: RoleEnum;
}

/** `AuthResponse` — login 200 */
export interface AuthResponse {
  token?: string;
  tokenType?: string;
  expiresIn?: number;
  user?: UserResponse;
}

/** `UserResponse` */
export interface UserResponse {
  id?: number;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  identification?: string;
  role?: RoleEnum;
  active?: boolean;
}
