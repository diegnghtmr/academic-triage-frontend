import { Routes } from '@angular/router';

import { roleGuard } from '@core/auth/role.guard';

export const REQUESTS_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'list',
  },
  {
    path: 'list',
    loadComponent: () =>
      import('./pages/request-list-page').then((m) => m.RequestListPage),
  },
  {
    path: 'new',
    canActivate: [roleGuard],
    data: { roles: ['STUDENT', 'STAFF'] },
    loadComponent: () =>
      import('./pages/request-create-page').then((m) => m.RequestCreatePage),
  },
  {
    path: ':requestId',
    loadComponent: () =>
      import('./pages/request-detail-page').then((m) => m.RequestDetailPage),
  },
];
