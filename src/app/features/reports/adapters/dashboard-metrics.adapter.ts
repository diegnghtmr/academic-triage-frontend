import type {
  DashboardMetrics,
  DashboardMetricsView,
  MetricEntry,
} from '../models/dashboard-metrics.types';

/**
 * Convierte un mapa `Record<string, number>` a un array de `MetricEntry`
 * ordenado de mayor a menor valor para su uso en `@for`.
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
 * Transforma el DTO crudo de `GET /reports/dashboard` al view model de la plantilla.
 * Los mapas se convierten en arrays ordenados; los valores ausentes se normalizan.
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
