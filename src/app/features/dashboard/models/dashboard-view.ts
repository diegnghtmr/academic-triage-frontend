import type { RequestResponse } from '@features/requests/models/request-api.types';

/**
 * Operational view for STUDENT and STAFF.
 * Derived from `GET /requests` (first page).
 * `total` reflects `totalElements` from the backend — a real count, not computed.
 */
export interface RequestsSummaryView {
  total: number;
  recent: RequestResponse[];
}
