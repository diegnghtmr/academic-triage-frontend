import { Routes } from '@angular/router';

import { authGuard } from '@core/auth/auth.guard';
// import { roleGuard } from '@core/auth/role.guard';
// Rutas futuras por rol: `canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN'] }`.

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
      import('@core/layout/app-shell').then((m) => m.AppShell),
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
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
