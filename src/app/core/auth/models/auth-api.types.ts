/**
 * DTOs alineados a `components/schemas` del OpenAPI (`docs/openapi-academic-triage.yaml`).
 * No reutilizar modelos legacy (`shared/schema.ts`).
 */

/** `RoleEnum` en el contrato. */
export type RoleEnum = 'ADMIN' | 'STAFF' | 'STUDENT';

/** `LoginRequest` */
export interface LoginRequest {
  username: string;
  password: string;
}

/** `RegisterRequest` — `role` solo asignable por ADMIN con token (no aplica al registro público). */
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
