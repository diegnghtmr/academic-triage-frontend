import { Routes } from '@angular/router';

import { roleGuard } from '@core/auth/role.guard';

export const BUSINESS_RULES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/business-rules-list-page').then(
        (m) => m.BusinessRulesListPage,
      ),
  },
  {
    path: 'new',
    canActivate: [roleGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () =>
      import('./pages/business-rule-form-page').then(
        (m) => m.BusinessRuleFormPage,
      ),
  },
  {
    path: ':id/edit',
    canActivate: [roleGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () =>
      import('./pages/business-rule-form-page').then(
        (m) => m.BusinessRuleFormPage,
      ),
  },
];
