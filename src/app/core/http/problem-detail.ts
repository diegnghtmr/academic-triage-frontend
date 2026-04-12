/** Alineado a `ProblemDetailResponse` del OpenAPI (`application/problem+json`). */
export interface ProblemDetailFieldError {
  field: string;
  message: string;
}

export interface ProblemDetail {
  type?: string | null;
  title?: string;
  status?: number;
  detail?: string | null;
  instance?: string | null;
  fieldErrors?: ProblemDetailFieldError[] | null;
}
