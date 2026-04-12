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
 * Transporte HTTP para `/business-rules`.
 * Escritura restringida a ADMIN por el backend; la UI añade `roleGuard` como segunda capa.
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

  update(
    ruleId: number,
    body: UpdateBusinessRuleBody,
  ): Observable<BusinessRuleResponse> {
    return this.http.put<BusinessRuleResponse>(
      `business-rules/${ruleId}`,
      body,
    );
  }

  /**
   * DELETE /business-rules/{ruleId} → 204 No Content.
   * El backend realiza soft-delete internamente; la UI usa el verbo HTTP del contrato.
   */
  delete(ruleId: number): Observable<void> {
    return this.http.delete<void>(`business-rules/${ruleId}`);
  }
}
