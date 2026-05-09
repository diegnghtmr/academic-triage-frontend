/**
 * Common shape for paginated responses (`PagedRequestResponse`, `PagedUserResponse`, …).
 * Features map OpenAPI DTOs to these types via adapters.
 */
export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}
