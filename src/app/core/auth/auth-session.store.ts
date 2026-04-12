import { computed, effect, Injectable, signal } from '@angular/core';

import { AUTH_SESSION_STORAGE_KEY } from './auth-session.storage';
import type { RoleEnum, UserResponse } from './models/auth-api.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function pickString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * Sesión autenticada (JWT + `UserResponse` del contrato).
 * Persistencia mínima en `localStorage`; sin llamadas HTTP.
 */
@Injectable({ providedIn: 'root' })
export class AuthSessionStore {
  private readonly _token = signal<string | null>(null);
  private readonly _user = signal<UserResponse | null>(null);

  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();

  readonly isAuthenticated = computed(() => {
    const t = this._token();
    const u = this._user();
    return t !== null && t !== '' && u !== null;
  });

  readonly role = computed((): RoleEnum | null => this._user()?.role ?? null);

  constructor() {
    this.restoreSession();
    effect(() => {
      const t = this._token();
      const u = this._user();
      if (t !== null && t !== '' && u !== null) {
        localStorage.setItem(
          AUTH_SESSION_STORAGE_KEY,
          JSON.stringify({ token: t, user: u }),
        );
      } else {
        localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
      }
    });
  }

  setSession(token: string, user: UserResponse): void {
    this._token.set(token);
    this._user.set(user);
  }

  clearSession(): void {
    this._token.set(null);
    this._user.set(null);
  }

  restoreSession(): void {
    try {
      const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
      if (raw === null) {
        return;
      }
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed)) {
        localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
        return;
      }
      const token = pickString(parsed['token']);
      const userRaw = parsed['user'];
      if (token === undefined || token === '' || !isRecord(userRaw)) {
        localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
        return;
      }
      this._token.set(token);
      this._user.set(userRaw as UserResponse);
    } catch {
      localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    }
  }
}
