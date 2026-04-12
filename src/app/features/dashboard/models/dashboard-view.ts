import type { RequestResponse } from '@features/requests/models/request-api.types';

/**
 * Vista operativa para STUDENT y STAFF.
 * Derivada de `GET /requests` (primera página).
 * `total` refleja `totalElements` del backend — dato real, no calculado.
 */
export interface RequestsSummaryView {
  total: number;
  recent: RequestResponse[];
}
