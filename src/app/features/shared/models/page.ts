/**
 * Forma común de respuestas paginadas (`PagedRequestResponse`, `PagedUserResponse`, …).
 * Los features mapean DTOs del OpenAPI a estos tipos vía adapters.
 */
export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}
