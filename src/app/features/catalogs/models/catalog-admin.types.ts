/**
 * DTOs de la feature catalogs — alineados a `docs/openapi-academic-triage.yaml`.
 * Los tipos de lectura (Response) se re-exportan desde @shared/models (fuente canónica).
 */

export type { RequestTypeResponse } from '@shared/models/request-type';
export type { OriginChannelResponse } from '@shared/models/origin-channel';

/** POST /catalogs/request-types · PUT /catalogs/request-types/{typeId} */
export interface CreateRequestTypeBody {
  name: string;
  description?: string;
}

/** POST /catalogs/origin-channels · PUT /catalogs/origin-channels/{channelId} */
export interface CreateOriginChannelBody {
  name: string;
}
