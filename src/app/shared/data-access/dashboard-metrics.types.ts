/**
 * Raw DTOs from `GET /reports/dashboard` — aligned to `docs/openapi-academic-triage.yaml`.
 *
 * The `requestsByStatus`, `requestsByType`, and `requestsByPriority` fields are maps
 * (`Record<string, number>`), not arrays. The adapter transforms them into `MetricEntry[]`
 * to facilitate template iteration.
 */

import type { UserResponse } from '@core/auth/models/auth-api.types';

/** Adapted entry from a `Record<string, number>` map for use in templates. */
export interface MetricEntry {
  key: string;
  value: number;
}

/** Raw entry from `topResponsibles`. */
export interface TopResponsibleEntry {
  user?: UserResponse;
  resolvedCount?: number;
}

/** Raw response from `GET /reports/dashboard`. */
export interface DashboardMetrics {
  totalRequests?: number;
  /** Map of status → count */
  requestsByStatus?: Record<string, number>;
  /** Map of type name → count */
  requestsByType?: Record<string, number>;
  /** Map of priority → count */
  requestsByPriority?: Record<string, number>;
  averageResolutionTimeHours?: number | null;
  topResponsibles?: TopResponsibleEntry[];
}

/** View model ready for the template: maps already converted to sorted arrays. */
export interface DashboardMetricsView {
  totalRequests: number;
  byStatus: MetricEntry[];
  byType: MetricEntry[];
  byPriority: MetricEntry[];
  averageResolutionTimeHours: number | null;
  topResponsibles: TopResponsibleEntry[];
}

/** Optional query parameters for the endpoint. */
export interface DashboardQueryParams {
  dateFrom?: string;
  dateTo?: string;
}
