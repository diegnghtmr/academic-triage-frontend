/**
 * DTOs alineados a `components/schemas` del OpenAPI (`docs/openapi-academic-triage.yaml`).
 * No reutilizar modelos legacy (`shared/schema.ts`).
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
 * `LoginRequest` — contrato canónico de login.
 *
 * **Campo canónico**: `identifier` (acepta nombre de usuario o correo electrónico).
 * **Alias deprecado**: `username` se mantiene solo para compatibilidad hacia atrás durante
 * la ventana de transición. Será eliminado en una versión futura.
 *
 * Reglas de precedencia (alineadas con el backend):
 * - Solo `identifier` → ruta canónica.
 * - Solo `username` → ruta alias (deprecada).
 * - Ambos con el **mismo** valor → se acepta como canónico.
 * - Ambos con **valores distintos** → 400 Bad Request (backend rechaza sin token).
 *
 * El frontend debe enviar únicamente `identifier` en flujos nuevos.
 * El campo `username` se expone aquí solo para tooling/tests de compatibilidad.
 */
export interface LoginRequest {
  identifier: string;
  password: string;
  /** @deprecated Use `identifier`. Kept for backward-compatibility tooling and tests only. */
  username?: string;
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
