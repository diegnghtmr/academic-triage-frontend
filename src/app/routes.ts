import { Routes } from '@angular/router';

import { authGuard } from '@core/auth/auth.guard';
import { roleGuard } from '@core/auth/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@features/public-home/public-home').then((m) => m.PublicHome),
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('@features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'app',
    loadComponent: () =>
      import('@features/layout/app-shell').then((m) => m.AppShell),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('@features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'requests',
        loadChildren: () =>
          import('@features/requests/requests.routes').then(
            (m) => m.REQUESTS_ROUTES,
          ),
      },
      {
        path: 'catalogs',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        loadChildren: () =>
          import('@features/catalogs/catalogs.routes').then(
            (m) => m.CATALOGS_ROUTES,
          ),
      },
      {
        path: 'business-rules',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'STAFF'] },
        loadChildren: () =>
          import('@features/business-rules/business-rules.routes').then(
            (m) => m.BUSINESS_RULES_ROUTES,
          ),
      },
      {
        path: 'users',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        loadChildren: () =>
          import('@features/users/users.routes').then((m) => m.USERS_ROUTES),
      },
      {
        path: 'reports',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        loadChildren: () =>
          import('@features/reports/reports.routes').then(
            (m) => m.REPORTS_ROUTES,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
