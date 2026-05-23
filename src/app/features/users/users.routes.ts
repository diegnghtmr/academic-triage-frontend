import { Routes } from '@angular/router';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/users-list-page').then((m) => m.UsersListPage),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./pages/user-form-page').then((m) => m.UserFormPage),
  },
];
