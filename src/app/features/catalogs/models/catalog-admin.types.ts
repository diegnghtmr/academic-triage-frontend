/**
 * DTOs de la feature catalogs — alineados a `docs/openapi-academic-triage.yaml`.
 * Los tipos de lectura (Response) están duplicados respecto a requests/models
 * intencionalmente: la feature catalogs es la dueña semántica de estos esquemas.
 * Refactorizar a shared/models cuando un tercer feature los consuma (Scope Rule).
 */

export interface RequestTypeResponse {
  id?: number;
  name?: string;
  description?: string;
  active?: boolean;
}

export interface OriginChannelResponse {
  id?: number;
  name?: string;
  active?: boolean;
}

/** POST /catalogs/request-types · PUT /catalogs/request-types/{typeId} */
export interface CreateRequestTypeBody {
  name: string;
  description?: string;
}

/** POST /catalogs/origin-channels · PUT /catalogs/origin-channels/{channelId} */
export interface CreateOriginChannelBody {
  name: string;
}
