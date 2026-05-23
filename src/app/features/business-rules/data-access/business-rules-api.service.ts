import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  BusinessRuleResponse,
  ConditionTypeEnum,
  CreateBusinessRuleBody,
  UpdateBusinessRuleBody,
} from '../models/business-rule.types';

/**
 * HTTP transport for `/business-rules`.
 * Write access is restricted to ADMIN by the backend; the UI adds `roleGuard` as a second layer.
 */
@Injectable({ providedIn: 'root' })
export class BusinessRulesApiService {
  private readonly http = inject(HttpClient);

  list(filters?: {
    active?: boolean;
    conditionType?: ConditionTypeEnum;
  }): Observable<BusinessRuleResponse[]> {
    let params = new HttpParams();
    if (filters?.active !== undefined) {
      params = params.set('active', String(filters.active));
    }
    if (filters?.conditionType !== undefined) {
      params = params.set('conditionType', filters.conditionType);
    }
    return this.http.get<BusinessRuleResponse[]>('business-rules', { params });
  }

  getById(ruleId: number): Observable<BusinessRuleResponse> {
    return this.http.get<BusinessRuleResponse>(`business-rules/${ruleId}`);
  }

  create(body: CreateBusinessRuleBody): Observable<BusinessRuleResponse> {
    return this.http.post<BusinessRuleResponse>('business-rules', body);
  }

  update(ruleId: number, body: UpdateBusinessRuleBody): Observable<BusinessRuleResponse> {
    return this.http.put<BusinessRuleResponse>(`business-rules/${ruleId}`, body);
  }

  /**
   * DELETE /business-rules/{ruleId} → 204 No Content.
   * The backend performs a soft-delete internally; the UI uses the HTTP verb from the contract.
   */
  delete(ruleId: number): Observable<void> {
    return this.http.delete<void>(`business-rules/${ruleId}`);
  }
}
