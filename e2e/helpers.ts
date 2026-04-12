import type { Page } from '@playwright/test';

/**
 * E2E authentication helpers.
 *
 * The Angular app persists auth state in localStorage under this key
 * (`src/app/core/auth/auth-session.storage.ts`). Injecting a session
 * before navigation makes AuthSessionStore.isAuthenticated() return true
 * without performing a real login request.
 *
 * IMPORTANT: The injected JWT tokens are synthetic — they are NOT verified
 * by any real backend. Any component that makes API calls on mount will
 * receive a real HTTP error (401/403) unless the relevant routes are mocked
 * with `page.route()` / `mockRequestsApi()` / `mockReportsApi()`.
 */

const AUTH_SESSION_KEY = 'academic-triage.spa.auth-session';

type RoleEnum = 'ADMIN' | 'STAFF' | 'STUDENT';

interface E2EUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  identification: string;
  role: RoleEnum;
  active: boolean;
}

interface E2ESession {
  token: string;
  user: E2EUser;
}

export const Sessions = {
  STUDENT: {
    token: 'e2e.fake.student.jwt',
    user: {
      id: 1,
      username: 'e2e-student',
      email: 'student@test.com',
      firstName: 'QA',
      lastName: 'Student',
      identification: 'STU-E2E-001',
      role: 'STUDENT' as RoleEnum,
      active: true,
    },
  },
  STAFF: {
    token: 'e2e.fake.staff.jwt',
    user: {
      id: 2,
      username: 'e2e-staff',
      email: 'staff@test.com',
      firstName: 'QA',
      lastName: 'Staff',
      identification: 'STA-E2E-001',
      role: 'STAFF' as RoleEnum,
      active: true,
    },
  },
  ADMIN: {
    token: 'e2e.fake.admin.jwt',
    user: {
      id: 3,
      username: 'e2e-admin',
      email: 'admin@test.com',
      firstName: 'QA',
      lastName: 'Admin',
      identification: 'ADM-E2E-001',
      role: 'ADMIN' as RoleEnum,
      active: true,
    },
  },
} as const satisfies Record<string, E2ESession>;

/**
 * Injects an auth session into localStorage before the Angular app boots.
 * MUST be called before `page.goto()` to take effect.
 */
export async function injectSession(page: Page, session: E2ESession): Promise<void> {
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      localStorage.setItem(key, value);
    },
    { key: AUTH_SESSION_KEY, value: JSON.stringify(session) },
  );
}

/**
 * Mocks GET /api/v1/requests with an empty paged response.
 * Required when navigating to pages that auto-fetch the requests list on mount
 * (Dashboard for STUDENT/STAFF, RequestListPage).
 */
export async function mockRequestsApi(page: Page): Promise<void> {
  await page.route('**/api/v1/requests**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: [],
        totalElements: 0,
        totalPages: 0,
        currentPage: 0,
        pageSize: 20,
      }),
    }),
  );
}

/**
 * Mocks GET /api/v1/reports/dashboard with empty metrics.
 * Required when navigating to ADMIN dashboard or ReportsDashboardPage.
 */
export async function mockReportsApi(page: Page): Promise<void> {
  await page.route('**/api/v1/reports/dashboard**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalRequests: 0,
        averageResolutionTimeHours: null,
        byStatus: [],
        topResponsibles: [],
      }),
    }),
  );
}
