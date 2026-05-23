/**
 * Tests for ReportsDashboardPage — helpers and computed signals.
 *
 * Strategy: instantiate the component class inside TestBed.runInInjectionContext
 * so Angular's injection system wires all dependencies but no DOM rendering occurs.
 * Protected/private members are reached via `(component as unknown as ComponentInternals)`
 * — the unknown cast ensures we never lose type safety accidentally.
 *
 * Signal-based computed properties are driven by stubbing the API to return
 * crafted DashboardMetrics payloads that flow through the constructor → load() → metrics().
 */
import '@angular/compiler';
import { provideZonelessChangeDetection } from '@angular/core';
import type { Provider, EnvironmentProviders } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { of } from 'rxjs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ProblemErrorMapper } from '@core/http/problem-error.mapper';
import { ReportsApiService } from '@shared/data-access/reports-api.service';
import type {
  DashboardMetrics,
  TopResponsibleEntry,
} from '@shared/data-access/dashboard-metrics.types';
import { ReportsDashboardPage } from './reports-dashboard-page';

// ── internal surface exposed only for testing ────────────────────────────────

interface PageInternals {
  percent(value: number, total: number): number;
  statusColor(key: string): string;
  priorityColor(key: string): string;
  initialsOf(name: string | null | undefined): string;
  fullNameOf(entry: {
    user?: { firstName?: string; lastName?: string; username?: string };
  }): string;
  statusMax(): number;
  priorityMax(): number;
  typeMax(): number;
  topPodium(): {
    gold: TopResponsibleEntry | null;
    silver: TopResponsibleEntry | null;
    bronze: TopResponsibleEntry | null;
  };
  hasActiveFilter(): boolean;
  activeFilterLabel(): string;
  appliedRange: { set(v: { from: string; to: string }): void };
  filterForm: {
    controls: { dateFrom: { setValue(v: string): void }; dateTo: { setValue(v: string): void } };
    reset(): void;
  };
  load(): void;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function buildRawMetrics(partial: Partial<DashboardMetrics> = {}): DashboardMetrics {
  return {
    totalRequests: 100,
    requestsByStatus: { REGISTERED: 40, CLASSIFIED: 30, IN_PROGRESS: 20, ATTENDED: 10 },
    requestsByType: { QUERY: 60, COMPLAINT: 40 },
    requestsByPriority: { HIGH: 25, MEDIUM: 50, LOW: 25 },
    averageResolutionTimeHours: 8,
    topResponsibles: [],
    ...partial,
  };
}

function setup(rawMetrics: DashboardMetrics = buildRawMetrics()): ReportsDashboardPage {
  const getDashboard = vi.fn().mockReturnValue(of(rawMetrics));

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection() as unknown as Provider | EnvironmentProviders,
      provideHttpClient(withFetch()),
      provideHttpClientTesting(),
      ProblemErrorMapper,
      { provide: ReportsApiService, useValue: { getDashboard } },
    ],
  });

  return TestBed.runInInjectionContext(() => new ReportsDashboardPage());
}

// ── test suite ───────────────────────────────────────────────────────────────

describe('ReportsDashboardPage', () => {
  beforeAll(() => {
    if (!('document' in globalThis)) {
      Object.defineProperty(globalThis, 'document', { value: {}, configurable: true });
    }
    try {
      TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    } catch {
      // Already initialized.
    }
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  // ── A. percent(value, total) ───────────────────────────────────────────────

  describe('percent(value, total)', () => {
    it('0 / 100 → 0', () => {
      const c = setup() as unknown as PageInternals;
      expect(c.percent(0, 100)).toBe(0);
    });

    it('25 / 100 → 25', () => {
      const c = setup() as unknown as PageInternals;
      expect(c.percent(25, 100)).toBe(25);
    });

    it('33 / 100 → 33 (Math.round)', () => {
      const c = setup() as unknown as PageInternals;
      expect(c.percent(33, 100)).toBe(33);
    });

    it('1 / 3 → 33 (Math.round)', () => {
      const c = setup() as unknown as PageInternals;
      expect(c.percent(1, 3)).toBe(33);
    });

    it('value / 0 → 0 (no division by zero)', () => {
      const c = setup() as unknown as PageInternals;
      expect(c.percent(50, 0)).toBe(0);
    });

    it('value with total < 0 → 0 (defensive)', () => {
      const c = setup() as unknown as PageInternals;
      expect(c.percent(50, -1)).toBe(0);
    });
  });

  // ── B. statusColor(key) ────────────────────────────────────────────────────

  describe('statusColor(key)', () => {
    it("'REGISTERED' → 'mercury'", () => {
      const c = setup() as unknown as PageInternals;
      expect(c.statusColor('REGISTERED')).toBe('mercury');
    });

    it("'CLASSIFIED' → 'info'", () => {
      const c = setup() as unknown as PageInternals;
      expect(c.statusColor('CLASSIFIED')).toBe('info');
    });

    it("'IN_PROGRESS' → 'warning'", () => {
      const c = setup() as unknown as PageInternals;
      expect(c.statusColor('IN_PROGRESS')).toBe('warning');
    });

    it("'ATTENDED' → 'success'", () => {
      const c = setup() as unknown as PageInternals;
      expect(c.statusColor('ATTENDED')).toBe('success');
    });

    it("'CLOSED' → 'muted'", () => {
      const c = setup() as unknown as PageInternals;
      expect(c.statusColor('CLOSED')).toBe('muted');
    });

    it("'CANCELLED' → 'muted'", () => {
      const c = setup() as unknown as PageInternals;
      expect(c.statusColor('CANCELLED')).toBe('muted');
    });

    it("'REJECTED' → 'danger'", () => {
      const c = setup() as unknown as PageInternals;
      expect(c.statusColor('REJECTED')).toBe('danger');
    });

    it("unknown key → 'mercury' (default)", () => {
      const c = setup() as unknown as PageInternals;
      expect(c.statusColor('WHATEVER')).toBe('mercury');
    });
  });

  // ── C. priorityColor(key) ─────────────────────────────────────────────────

  describe('priorityColor(key)', () => {
    it("'HIGH' → 'danger'", () => {
      const c = setup() as unknown as PageInternals;
      expect(c.priorityColor('HIGH')).toBe('danger');
    });

    it("'MEDIUM' → 'warning'", () => {
      const c = setup() as unknown as PageInternals;
      expect(c.priorityColor('MEDIUM')).toBe('warning');
    });

    it("'LOW' → 'success'", () => {
      const c = setup() as unknown as PageInternals;
      expect(c.priorityColor('LOW')).toBe('success');
    });

    it("unknown key → 'mercury'", () => {
      const c = setup() as unknown as PageInternals;
      expect(c.priorityColor('UNKNOWN')).toBe('mercury');
    });
  });

  // ── D. initialsOf / fullNameOf ────────────────────────────────────────────

  describe('initialsOf(name)', () => {
    it("'m.rojas' → 'MR'", () => {
      const c = setup() as unknown as PageInternals;
      expect(c.initialsOf('m.rojas')).toBe('MR');
    });

    it("'mariana' → 'MA'", () => {
      const c = setup() as unknown as PageInternals;
      expect(c.initialsOf('mariana')).toBe('MA');
    });

    it("'' → '··'", () => {
      const c = setup() as unknown as PageInternals;
      expect(c.initialsOf('')).toBe('··');
    });

    it("null → '··'", () => {
      const c = setup() as unknown as PageInternals;
      expect(c.initialsOf(null)).toBe('··');
    });

    it("undefined → '··'", () => {
      const c = setup() as unknown as PageInternals;
      expect(c.initialsOf(undefined)).toBe('··');
    });

    it("'   ' (spaces only) → '··'", () => {
      const c = setup() as unknown as PageInternals;
      expect(c.initialsOf('   ')).toBe('··');
    });
  });

  describe('fullNameOf(entry)', () => {
    it("{ user: { firstName: 'Mariana', lastName: 'Rojas' } } → 'Mariana Rojas'", () => {
      const c = setup() as unknown as PageInternals;
      expect(c.fullNameOf({ user: { firstName: 'Mariana', lastName: 'Rojas' } })).toBe(
        'Mariana Rojas',
      );
    });

    it("{ user: { firstName: 'Ana' } } → 'Ana'", () => {
      const c = setup() as unknown as PageInternals;
      expect(c.fullNameOf({ user: { firstName: 'Ana' } })).toBe('Ana');
    });

    it("{ user: { username: 'u1' } } → 'u1' (fallback when no first/last)", () => {
      const c = setup() as unknown as PageInternals;
      expect(c.fullNameOf({ user: { username: 'u1' } })).toBe('u1');
    });

    it("{} → '—' (no user key)", () => {
      const c = setup() as unknown as PageInternals;
      expect(c.fullNameOf({})).toBe('—');
    });
  });

  // ── E. Computed signals ───────────────────────────────────────────────────

  describe('statusMax()', () => {
    it('returns 1 when metrics has no byStatus entries', () => {
      const c = setup(buildRawMetrics({ requestsByStatus: {} })) as unknown as PageInternals;
      expect(c.statusMax()).toBe(1);
    });

    it('returns the maximum value from byStatus', () => {
      const c = setup(
        buildRawMetrics({ requestsByStatus: { A: 10, B: 50, C: 5 } }),
      ) as unknown as PageInternals;
      expect(c.statusMax()).toBe(50);
    });
  });

  describe('priorityMax()', () => {
    it('returns 1 when metrics has no byPriority entries', () => {
      const c = setup(buildRawMetrics({ requestsByPriority: {} })) as unknown as PageInternals;
      expect(c.priorityMax()).toBe(1);
    });

    it('returns the maximum value from byPriority', () => {
      const c = setup(
        buildRawMetrics({ requestsByPriority: { HIGH: 3, MEDIUM: 7, LOW: 1 } }),
      ) as unknown as PageInternals;
      expect(c.priorityMax()).toBe(7);
    });
  });

  describe('typeMax()', () => {
    it('returns 1 when metrics has no byType entries', () => {
      const c = setup(buildRawMetrics({ requestsByType: {} })) as unknown as PageInternals;
      expect(c.typeMax()).toBe(1);
    });

    it('returns the maximum value from byType', () => {
      const c = setup(
        buildRawMetrics({ requestsByType: { QUERY: 100, COMPLAINT: 30 } }),
      ) as unknown as PageInternals;
      expect(c.typeMax()).toBe(100);
    });
  });

  describe('topPodium()', () => {
    it('returns all null slots when topResponsibles is empty', () => {
      const c = setup(buildRawMetrics({ topResponsibles: [] })) as unknown as PageInternals;
      const podium = c.topPodium();
      expect(podium.gold).toBeNull();
      expect(podium.silver).toBeNull();
      expect(podium.bronze).toBeNull();
    });

    it('returns gold only when there is exactly 1 responsible', () => {
      const one: TopResponsibleEntry[] = [{ user: { username: 'a' }, resolvedCount: 5 }];
      const c = setup(buildRawMetrics({ topResponsibles: one })) as unknown as PageInternals;
      const podium = c.topPodium();
      expect(podium.gold?.user?.username).toBe('a');
      expect(podium.silver).toBeNull();
      expect(podium.bronze).toBeNull();
    });

    it('returns gold and silver when there are exactly 2 responsibles', () => {
      const two: TopResponsibleEntry[] = [
        { user: { username: 'a' }, resolvedCount: 5 },
        { user: { username: 'b' }, resolvedCount: 3 },
      ];
      const c = setup(buildRawMetrics({ topResponsibles: two })) as unknown as PageInternals;
      const podium = c.topPodium();
      expect(podium.gold?.user?.username).toBe('a');
      expect(podium.silver?.user?.username).toBe('b');
      expect(podium.bronze).toBeNull();
    });

    it('maps first 3 to gold/silver/bronze when there are 3+ responsibles', () => {
      const three: TopResponsibleEntry[] = [
        { user: { username: 'gold' }, resolvedCount: 10 },
        { user: { username: 'silver' }, resolvedCount: 7 },
        { user: { username: 'bronze' }, resolvedCount: 4 },
        { user: { username: 'fourth' }, resolvedCount: 2 },
      ];
      const c = setup(buildRawMetrics({ topResponsibles: three })) as unknown as PageInternals;
      const podium = c.topPodium();
      expect(podium.gold?.user?.username).toBe('gold');
      expect(podium.silver?.user?.username).toBe('silver');
      expect(podium.bronze?.user?.username).toBe('bronze');
    });
  });

  describe('hasActiveFilter()', () => {
    it('returns false when appliedRange is empty (initial state)', () => {
      const c = setup() as unknown as PageInternals;
      // After setup, filterForm has default empty values so appliedRange is {from:'',to:''}
      expect(c.hasActiveFilter()).toBe(false);
    });

    it('returns true when appliedRange.from is set', () => {
      const c = setup() as unknown as PageInternals;
      c.appliedRange.set({ from: '2024-01-01', to: '' });
      expect(c.hasActiveFilter()).toBe(true);
    });

    it('returns true when appliedRange.to is set', () => {
      const c = setup() as unknown as PageInternals;
      c.appliedRange.set({ from: '', to: '2024-12-31' });
      expect(c.hasActiveFilter()).toBe(true);
    });

    it('returns true when both from and to are set', () => {
      const c = setup() as unknown as PageInternals;
      c.appliedRange.set({ from: '2024-01-01', to: '2024-12-31' });
      expect(c.hasActiveFilter()).toBe(true);
    });
  });

  describe('activeFilterLabel()', () => {
    it("returns '' when no filter is active", () => {
      const c = setup() as unknown as PageInternals;
      expect(c.activeFilterLabel()).toBe('');
    });

    it("returns 'Desde {from}' when only from is set", () => {
      const c = setup() as unknown as PageInternals;
      c.appliedRange.set({ from: '2024-01-01', to: '' });
      expect(c.activeFilterLabel()).toBe('Desde 2024-01-01');
    });

    it("returns 'Hasta {to}' when only to is set", () => {
      const c = setup() as unknown as PageInternals;
      c.appliedRange.set({ from: '', to: '2024-12-31' });
      expect(c.activeFilterLabel()).toBe('Hasta 2024-12-31');
    });

    it("returns '{from} → {to}' when both are set", () => {
      const c = setup() as unknown as PageInternals;
      c.appliedRange.set({ from: '2024-01-01', to: '2024-12-31' });
      expect(c.activeFilterLabel()).toBe('2024-01-01 → 2024-12-31');
    });
  });
});
