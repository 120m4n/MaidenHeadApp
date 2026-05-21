import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const TAB_ROUTES: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'home',
        loadComponent: () => import('../home/home.page').then(m => m.HomePage),
      },
      {
        path: 'grid-lookup',
        loadComponent: () => import('../grid-lookup/grid-lookup.page').then(m => m.GridLookupPage),
      },
      {
        path: 'qso-log',
        loadComponent: () => import('../qso-log/qso-log.page').then(m => m.QsoLogPage),
      },
      {
        path: 'settings',
        loadComponent: () => import('../settings/settings.page').then(m => m.SettingsPage),
      },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
];
