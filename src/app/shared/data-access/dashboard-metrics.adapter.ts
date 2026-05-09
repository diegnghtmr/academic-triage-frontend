import type {
  DashboardMetrics,
  DashboardMetricsView,
  MetricEntry,
} from './dashboard-metrics.types';

/**
 * Converts a `Record<string, number>` map to a `MetricEntry` array
 * sorted from highest to lowest value for use in `@for`.
 */
function mapToEntries(map: Record<string, number> | undefined): MetricEntry[] {
  if (map === undefined) {
    return [];
  }
  return Object.entries(map)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Transforms the raw `GET /reports/dashboard` DTO into the template view model.
 * Maps are converted to sorted arrays; missing values are normalised.
 */
export function adaptDashboardMetrics(raw: DashboardMetrics): DashboardMetricsView {
  return {
    totalRequests: raw.totalRequests ?? 0,
    byStatus: mapToEntries(raw.requestsByStatus),
    byType: mapToEntries(raw.requestsByType),
    byPriority: mapToEntries(raw.requestsByPriority),
    averageResolutionTimeHours: raw.averageResolutionTimeHours ?? null,
    topResponsibles: raw.topResponsibles ?? [],
  };
}
