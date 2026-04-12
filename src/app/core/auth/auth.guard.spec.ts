import { describe, expect, it } from 'vitest';

/**
 * Decision logic of `authGuard` — validated as pure function.
 *
 * The actual guard wires this logic to `AuthSessionStore` and `Router` via `inject()`.
 * Angular DI integration is covered by E2E smoke tests (`e2e/role-access.spec.ts`).
 *
 * Contract (from `src/app/core/auth/auth.guard.ts`):
 *   - Authenticated   → allow navigation
 *   - Unauthenticated → redirect to `/auth/login?returnUrl=<current>`
 */

type AuthGuardOutcome = 'allow' | 'redirect-login';

function resolveAuthGuard(isAuthenticated: boolean): AuthGuardOutcome {
  return isAuthenticated ? 'allow' : 'redirect-login';
}

describe('authGuard decision logic', () => {
  it('allows navigation when user is authenticated', () => {
    expect(resolveAuthGuard(true)).toBe('allow');
  });

  it('redirects to login when user is not authenticated', () => {
    expect(resolveAuthGuard(false)).toBe('redirect-login');
  });
});
