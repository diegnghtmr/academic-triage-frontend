import { Routes } from '@angular/router';

export const REPORTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/reports-dashboard-page').then((m) => m.ReportsDashboardPage),
  },
];
