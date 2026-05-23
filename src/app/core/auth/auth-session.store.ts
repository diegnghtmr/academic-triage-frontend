import { computed, effect, Injectable, signal } from '@angular/core';

import { parseStoredUser } from '@core/http/auth-validation';
import { AUTH_SESSION_STORAGE_KEY } from './auth-session.storage';
import type { RoleEnum, UserResponse } from './models/auth-api.types';

/**
 * Authenticated session (JWT + `UserResponse` from the contract).
 * Minimal persistence in `localStorage`; no HTTP calls.
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
        localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ token: t, user: u }));
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
      if (raw === null) return;
      const session = parseStoredUser(JSON.parse(raw));
      if (session === null) {
        localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
        return;
      }
      this._token.set(session.token);
      this._user.set(session.user);
    } catch {
      localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    }
  }
}
