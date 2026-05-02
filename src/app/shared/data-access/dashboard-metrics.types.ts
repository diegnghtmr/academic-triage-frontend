/**
 * DTOs crudos de `GET /reports/dashboard` — alineados a `docs/openapi-academic-triage.yaml`.
 *
 * Los campos `requestsByStatus`, `requestsByType` y `requestsByPriority` son mapas
 * (`Record<string, number>`), no arrays. El adapter los transforma a `MetricEntry[]`
 * para facilitar la iteración en templates.
 */

import type { UserResponse } from '@core/auth/models/auth-api.types';

/** Entrada adaptada de un mapa `Record<string, number>` para uso en templates. */
export interface MetricEntry {
  key: string;
  value: number;
}

/** Entrada cruda de `topResponsibles`. */
export interface TopResponsibleEntry {
  user?: UserResponse;
  resolvedCount?: number;
}

/** Respuesta cruda de `GET /reports/dashboard`. */
export interface DashboardMetrics {
  totalRequests?: number;
  /** Mapa status → conteo */
  requestsByStatus?: Record<string, number>;
  /** Mapa nombre de tipo → conteo */
  requestsByType?: Record<string, number>;
  /** Mapa prioridad → conteo */
  requestsByPriority?: Record<string, number>;
  averageResolutionTimeHours?: number | null;
  topResponsibles?: TopResponsibleEntry[];
}

/** View model listo para la plantilla: mapas ya convertidos a arrays ordenados. */
export interface DashboardMetricsView {
  totalRequests: number;
  byStatus: MetricEntry[];
  byType: MetricEntry[];
  byPriority: MetricEntry[];
  averageResolutionTimeHours: number | null;
  topResponsibles: TopResponsibleEntry[];
}

/** Parámetros opcionales del endpoint. */
export interface DashboardQueryParams {
  dateFrom?: string;
  dateTo?: string;
}
