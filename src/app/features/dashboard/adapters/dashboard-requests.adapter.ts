import type { PagedRequestResponse } from '@features/requests/models/request-api.types';

import type { RequestsSummaryView } from '../models/dashboard-view';

/**
 * Converts the paginated `GET /requests` response to the dashboard view model.
 * `total` comes from `totalElements` — the real count from the backend.
 * `recent` holds the first N items from the page (max 5 in the dashboard query).
 */
export function adaptRequestsSummary(page: PagedRequestResponse): RequestsSummaryView {
  return {
    total: page.totalElements ?? 0,
    recent: page.content ?? [],
  };
}
