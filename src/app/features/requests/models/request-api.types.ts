/**
 * DTOs alineados a `docs/openapi-academic-triage.yaml` (Requests, History, Catalogs lectura).
 * `UserResponse` reutilizado desde auth (mismo contrato).
 */

import type { UserResponse } from '@core/auth/models/auth-api.types';
import type { PriorityEnum } from '@shared/models/priority';
import type { RequestTypeResponse } from '@shared/models/request-type';
import type { OriginChannelResponse } from '@shared/models/origin-channel';

export type RequestStatusEnum =
  | 'REGISTERED'
  | 'CLASSIFIED'
  | 'IN_PROGRESS'
  | 'ATTENDED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'REJECTED';

export type { PriorityEnum } from '@shared/models/priority';
export type { RequestTypeResponse } from '@shared/models/request-type';
export type { OriginChannelResponse } from '@shared/models/origin-channel';

export interface CreateRequestBody {
  requestTypeId: number;
  originChannelId: number;
  description: string;
  deadline?: string | null;
}

export interface RequestResponse {
  id?: number;
  description?: string;
  registrationDateTime?: string;
  status?: RequestStatusEnum;
  priority?: PriorityEnum | null;
  priorityJustification?: string | null;
  closingObservation?: string | null;
  cancellationReason?: string | null;
  rejectionReason?: string | null;
  deadline?: string | null;
  aiSuggested?: boolean;
  requestType?: RequestTypeResponse;
  originChannel?: OriginChannelResponse;
  requester?: UserResponse;
  assignedTo?: UserResponse | null;
}

export interface RequestDetailResponse extends RequestResponse {
  history?: HistoryEntryResponse[];
}

export interface PagedRequestResponse {
  content?: RequestResponse[];
  totalElements?: number;
  totalPages?: number;
  currentPage?: number;
  pageSize?: number;
}

export interface ListRequestsQueryParams {
  status?: RequestStatusEnum;
  requestTypeId?: number;
  priority?: PriorityEnum;
  assignedToUserId?: number;
  requesterUserId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface HistoryEntryResponse {
  id?: number;
  action?: string;
  observations?: string | null;
  timestamp?: string;
  performedBy?: UserResponse;
}

export interface AddHistoryNoteBody {
  observations: string;
}

export interface ClassifyRequestBody {
  requestTypeId: number;
  observations?: string;
}

export interface PrioritizeRequestBody {
  priority: PriorityEnum;
  justification: string;
}

export interface AssignRequestBody {
  assignedToUserId: number;
  observations?: string;
}

export interface AttendRequestBody {
  observations: string;
}

export interface CloseRequestBody {
  closingObservation: string;
}

export interface CancelRequestBody {
  cancellationReason: string;
}

export interface RejectRequestBody {
  rejectionReason: string;
}

export interface MatchedRuleSuggestionItem {
  ruleId?: number;
  name?: string;
  resultingPriority?: PriorityEnum;
}

export interface PrioritySuggestionResponse {
  suggestedPriority?: PriorityEnum;
  matchedRules?: MatchedRuleSuggestionItem[];
}
