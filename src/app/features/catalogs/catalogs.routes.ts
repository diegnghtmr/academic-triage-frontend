import { Routes } from '@angular/router';

export const CATALOGS_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'request-types',
  },

  // ── Request Types ──────────────────────────────────────────────────────────
  {
    path: 'request-types',
    loadComponent: () =>
      import('./pages/request-types-list-page').then(
        (m) => m.RequestTypesListPage,
      ),
  },
  {
    path: 'request-types/new',
    loadComponent: () =>
      import('./pages/request-type-form-page').then(
        (m) => m.RequestTypeFormPage,
      ),
  },
  {
    path: 'request-types/:id/edit',
    loadComponent: () =>
      import('./pages/request-type-form-page').then(
        (m) => m.RequestTypeFormPage,
      ),
  },

  // ── Origin Channels ────────────────────────────────────────────────────────
  {
    path: 'origin-channels',
    loadComponent: () =>
      import('./pages/origin-channels-list-page').then(
        (m) => m.OriginChannelsListPage,
      ),
  },
  {
    path: 'origin-channels/new',
    loadComponent: () =>
      import('./pages/origin-channel-form-page').then(
        (m) => m.OriginChannelFormPage,
      ),
  },
  {
    path: 'origin-channels/:id/edit',
    loadComponent: () =>
      import('./pages/origin-channel-form-page').then(
        (m) => m.OriginChannelFormPage,
      ),
  },
];
