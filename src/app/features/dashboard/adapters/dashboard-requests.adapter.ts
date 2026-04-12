import type { PagedRequestResponse } from '@features/requests/models/request-api.types';

import type { RequestsSummaryView } from '../models/dashboard-view';

/**
 * Convierte la respuesta paginada de `GET /requests` al view model del dashboard.
 * `total` se toma de `totalElements` — dato real del backend.
 * `recent` son los primeros N ítems de la página (máx. 5 en la query del dashboard).
 */
export function adaptRequestsSummary(page: PagedRequestResponse): RequestsSummaryView {
  return {
    total: page.totalElements ?? 0,
    recent: page.content ?? [],
  };
}
