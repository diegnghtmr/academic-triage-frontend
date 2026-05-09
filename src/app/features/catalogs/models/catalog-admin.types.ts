/**
 * DTOs for the catalogs feature — aligned to `docs/openapi-academic-triage.yaml`.
 * Read types (Response) are re-exported from @shared/models (canonical source).
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
