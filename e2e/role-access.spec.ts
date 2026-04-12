import { expect, test } from '@playwright/test';

import { injectSession, mockReportsApi, mockRequestsApi, Sessions } from './helpers';

// ─────────────────────────────────────────────────────────────────────────────
// Role-access smoke suite
//
// Strategy: localStorage injection bypasses the login flow so we can verify
// route guards and shell navigation visibility without a real backend.
// API calls from components are mocked via page.route() where needed.
//
// Fixture sessions are defined in e2e/helpers.ts.
// Angular route configuration is in src/app/routes.ts and feature routes files.
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. Unauthenticated access ─────────────────────────────────────────────────

test.describe('unauthenticated access', () => {
  test(
    'redirects /app/dashboard to /auth/login when no session exists',
    { tag: ['@critical', '@e2e', '@auth-guard', '@ROLE-E2E-001'] },
    async ({ page }) => {
      await page.goto('/app/dashboard');
      await expect(page).toHaveURL(/\/auth\/login/);
    },
  );

  test(
    'redirects /app/requests/list to /auth/login when no session exists',
    { tag: ['@e2e', '@auth-guard', '@ROLE-E2E-002'] },
    async ({ page }) => {
      await page.goto('/app/requests/list');
      await expect(page).toHaveURL(/\/auth\/login/);
    },
  );

  test(
    'preserves returnUrl query param on redirect',
    { tag: ['@e2e', '@auth-guard', '@ROLE-E2E-003'] },
    async ({ page }) => {
      await page.goto('/app/reports');
      await expect(page).toHaveURL(/\/auth\/login\?returnUrl=/);
    },
  );

  test(
    'authenticated user visiting /auth/login is redirected to /app',
    { tag: ['@e2e', '@guest-guard', '@ROLE-E2E-004'] },
    async ({ page }) => {
      await injectSession(page, Sessions.STUDENT);
      await page.goto('/auth/login');
      await expect(page).toHaveURL(/\/app/);
    },
  );
});

// ── 2. STUDENT journeys ───────────────────────────────────────────────────────

test.describe('STUDENT role access', () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page, Sessions.STUDENT);
    await mockRequestsApi(page);
  });

  test(
    'can navigate to dashboard',
    { tag: ['@e2e', '@student', '@ROLE-E2E-010'] },
    async ({ page }) => {
      await page.goto('/app/dashboard');
      await expect(page).toHaveURL(/\/app\/dashboard/);
      await expect(page.getByRole('banner')).toBeVisible();
    },
  );

  test(
    'shell shows "Nueva solicitud" link',
    { tag: ['@e2e', '@student', '@ROLE-E2E-011'] },
    async ({ page }) => {
      await page.goto('/app/dashboard');
      const nav = page.getByRole('navigation', { name: 'Navegación principal' });
      await expect(nav.getByRole('link', { name: 'Nueva solicitud' })).toBeVisible();
    },
  );

  test(
    'shell does NOT show "Reportes" link',
    { tag: ['@e2e', '@student', '@ROLE-E2E-012'] },
    async ({ page }) => {
      await page.goto('/app/dashboard');
      const nav = page.getByRole('navigation', { name: 'Navegación principal' });
      await expect(nav.getByRole('link', { name: 'Reportes' })).not.toBeVisible();
    },
  );

  test(
    'shell does NOT show "Usuarios" link',
    { tag: ['@e2e', '@student', '@ROLE-E2E-013'] },
    async ({ page }) => {
      await page.goto('/app/dashboard');
      const nav = page.getByRole('navigation', { name: 'Navegación principal' });
      await expect(nav.getByRole('link', { name: 'Usuarios' })).not.toBeVisible();
    },
  );

  test(
    'shell does NOT show "Reglas de negocio" link',
    { tag: ['@e2e', '@student', '@ROLE-E2E-014'] },
    async ({ page }) => {
      await page.goto('/app/dashboard');
      const nav = page.getByRole('navigation', { name: 'Navegación principal' });
      await expect(nav.getByRole('link', { name: 'Reglas de negocio' })).not.toBeVisible();
    },
  );

  test(
    'access to /app/catalogs is blocked by roleGuard (redirects to /app)',
    { tag: ['@e2e', '@student', '@role-guard', '@ROLE-E2E-015'] },
    async ({ page }) => {
      await page.goto('/app/catalogs');
      await expect(page).toHaveURL(/\/app\/?(?!catalogs)/);
    },
  );

  test(
    'access to /app/reports is blocked by roleGuard (redirects to /app)',
    { tag: ['@e2e', '@student', '@role-guard', '@ROLE-E2E-016'] },
    async ({ page }) => {
      await page.goto('/app/reports');
      await expect(page).toHaveURL(/\/app\/?(?!reports)/);
    },
  );

  test(
    'access to /app/users is blocked by roleGuard (redirects to /app)',
    { tag: ['@e2e', '@student', '@role-guard', '@ROLE-E2E-017'] },
    async ({ page }) => {
      await page.goto('/app/users');
      await expect(page).toHaveURL(/\/app\/?(?!users)/);
    },
  );
});

// ── 3. STAFF journeys ─────────────────────────────────────────────────────────

test.describe('STAFF role access', () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page, Sessions.STAFF);
    await mockRequestsApi(page);
  });

  test(
    'can navigate to dashboard',
    { tag: ['@e2e', '@staff', '@ROLE-E2E-020'] },
    async ({ page }) => {
      await page.goto('/app/dashboard');
      await expect(page).toHaveURL(/\/app\/dashboard/);
      await expect(page.getByRole('banner')).toBeVisible();
    },
  );

  test(
    'shell shows "Nueva solicitud" link',
    { tag: ['@e2e', '@staff', '@ROLE-E2E-021'] },
    async ({ page }) => {
      await page.goto('/app/dashboard');
      const nav = page.getByRole('navigation', { name: 'Navegación principal' });
      await expect(nav.getByRole('link', { name: 'Nueva solicitud' })).toBeVisible();
    },
  );

  test(
    'shell shows "Reglas de negocio" link',
    { tag: ['@e2e', '@staff', '@ROLE-E2E-022'] },
    async ({ page }) => {
      await page.goto('/app/dashboard');
      const nav = page.getByRole('navigation', { name: 'Navegación principal' });
      await expect(nav.getByRole('link', { name: 'Reglas de negocio' })).toBeVisible();
    },
  );

  test(
    'shell does NOT show "Reportes" link',
    { tag: ['@e2e', '@staff', '@ROLE-E2E-023'] },
    async ({ page }) => {
      await page.goto('/app/dashboard');
      const nav = page.getByRole('navigation', { name: 'Navegación principal' });
      await expect(nav.getByRole('link', { name: 'Reportes' })).not.toBeVisible();
    },
  );

  test(
    'access to /app/catalogs is blocked by roleGuard (ADMIN-only)',
    { tag: ['@e2e', '@staff', '@role-guard', '@ROLE-E2E-024'] },
    async ({ page }) => {
      await page.goto('/app/catalogs');
      await expect(page).toHaveURL(/\/app\/?(?!catalogs)/);
    },
  );

  test(
    'access to /app/reports is blocked by roleGuard (ADMIN-only per OpenAPI)',
    { tag: ['@e2e', '@staff', '@role-guard', '@ROLE-E2E-025'] },
    async ({ page }) => {
      await page.goto('/app/reports');
      await expect(page).toHaveURL(/\/app\/?(?!reports)/);
    },
  );

  test(
    'access to /app/users is blocked by roleGuard (ADMIN-only)',
    { tag: ['@e2e', '@staff', '@role-guard', '@ROLE-E2E-026'] },
    async ({ page }) => {
      await page.goto('/app/users');
      await expect(page).toHaveURL(/\/app\/?(?!users)/);
    },
  );
});

// ── 4. ADMIN journeys ─────────────────────────────────────────────────────────

test.describe('ADMIN role access', () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page, Sessions.ADMIN);
    await mockRequestsApi(page);
    await mockReportsApi(page);
  });

  test(
    'can navigate to dashboard',
    { tag: ['@e2e', '@admin', '@ROLE-E2E-030'] },
    async ({ page }) => {
      await page.goto('/app/dashboard');
      await expect(page).toHaveURL(/\/app\/dashboard/);
      await expect(page.getByRole('banner')).toBeVisible();
    },
  );

  test(
    'shell does NOT show "Nueva solicitud" link',
    { tag: ['@e2e', '@admin', '@ROLE-E2E-031'] },
    async ({ page }) => {
      await page.goto('/app/dashboard');
      const nav = page.getByRole('navigation', { name: 'Navegación principal' });
      await expect(nav.getByRole('link', { name: 'Nueva solicitud' })).not.toBeVisible();
    },
  );

  test(
    'shell shows "Reportes" link',
    { tag: ['@e2e', '@admin', '@ROLE-E2E-032'] },
    async ({ page }) => {
      await page.goto('/app/dashboard');
      const nav = page.getByRole('navigation', { name: 'Navegación principal' });
      await expect(nav.getByRole('link', { name: 'Reportes' })).toBeVisible();
    },
  );

  test(
    'shell shows "Usuarios" link',
    { tag: ['@e2e', '@admin', '@ROLE-E2E-033'] },
    async ({ page }) => {
      await page.goto('/app/dashboard');
      const nav = page.getByRole('navigation', { name: 'Navegación principal' });
      await expect(nav.getByRole('link', { name: 'Usuarios' })).toBeVisible();
    },
  );

  test(
    'shell shows "Reglas de negocio" link',
    { tag: ['@e2e', '@admin', '@ROLE-E2E-034'] },
    async ({ page }) => {
      await page.goto('/app/dashboard');
      const nav = page.getByRole('navigation', { name: 'Navegación principal' });
      await expect(nav.getByRole('link', { name: 'Reglas de negocio' })).toBeVisible();
    },
  );

  test(
    'can access /app/reports',
    { tag: ['@e2e', '@admin', '@ROLE-E2E-035'] },
    async ({ page }) => {
      await page.goto('/app/reports');
      await expect(page).toHaveURL(/\/app\/reports/);
    },
  );

  test(
    'can access /app/catalogs',
    { tag: ['@e2e', '@admin', '@ROLE-E2E-036'] },
    async ({ page }) => {
      await page.goto('/app/catalogs');
      await expect(page).toHaveURL(/\/app\/catalogs/);
    },
  );

  test(
    'can access /app/users',
    { tag: ['@e2e', '@admin', '@ROLE-E2E-037'] },
    async ({ page }) => {
      await page.goto('/app/users');
      await expect(page).toHaveURL(/\/app\/users/);
    },
  );
});
