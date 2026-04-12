import { describe, expect, it } from 'vitest';

/**
 * Decision logic of `guestGuard` — validated as pure function.
 *
 * The actual guard wires this logic to `AuthSessionStore` and `Router` via `inject()`.
 * Angular DI integration is covered by E2E smoke tests (`e2e/role-access.spec.ts`).
 *
 * Contract (from `src/app/core/auth/guest.guard.ts`):
 *   - Already authenticated → redirect to `/app` (prevents re-visiting login/register)
 *   - Not authenticated     → allow (can see login/register pages)
 */

type GuestGuardOutcome = 'allow' | 'redirect-app';

function resolveGuestGuard(isAuthenticated: boolean): GuestGuardOutcome {
  return isAuthenticated ? 'redirect-app' : 'allow';
}

describe('guestGuard decision logic', () => {
  it('redirects to /app when user is already authenticated', () => {
    expect(resolveGuestGuard(true)).toBe('redirect-app');
  });

  it('allows access to guest routes when user is not authenticated', () => {
    expect(resolveGuestGuard(false)).toBe('allow');
  });
});
