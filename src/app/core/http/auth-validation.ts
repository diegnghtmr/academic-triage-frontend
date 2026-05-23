import { ROLE } from '@core/auth/models/auth-api.types';
import type { RoleEnum, UserResponse } from '@core/auth/models/auth-api.types';

/** Validated stored session shape (token + full UserResponse). */
export interface StoredSession {
  token: string;
  user: UserResponse;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Type-guard: narrows `unknown` to `RoleEnum`. */
export function isRoleEnum(value: unknown): value is RoleEnum {
  return value === ROLE.ADMIN || value === ROLE.STAFF || value === ROLE.STUDENT;
}

/**
 * Parses and validates a raw `localStorage` payload.
 *
 * Returns a `StoredSession` when the payload satisfies:
 *   - root is a plain record
 *   - `token` is a non-empty string
 *   - `user` is a plain record
 *   - `user.id` is a finite number
 *   - `user.username` is a non-empty string
 *   - `user.role`, if present, is a valid `RoleEnum` value
 *
 * Returns `null` (never throws) on any validation failure.
 */
export function parseStoredUser(raw: unknown): StoredSession | null {
  if (!isRecord(raw)) return null;

  const { token, user: userRaw } = raw;

  if (typeof token !== 'string' || token === '') return null;
  if (!isRecord(userRaw)) return null;

  const { id, username, role } = userRaw;

  if (typeof id !== 'number' || !Number.isFinite(id)) return null;
  if (typeof username !== 'string' || username === '') return null;
  if (role !== undefined && !isRoleEnum(role)) return null;

  // Shape is valid — cast is safe: we have verified all required fields.
  const user = userRaw as UserResponse;
  return { token, user };
}
