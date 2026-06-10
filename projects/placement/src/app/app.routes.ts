import { Routes } from '@angular/router';
import { SharedAuthComponent } from '@libs/shared-auth';
import { NavigationComponent } from './modules/navigation/navigation.component';

export const APP_ROUTES: Routes = [
  // {
  //   path: '',
  //   redirectTo: 'login',
  //   pathMatch: 'full',
  // },
  // {
  //   path: 'login',
  //   component: SharedAuthComponent,
  //   data: {
  //     module: 'placement',
  //   },
  // },
  {
    path: 'kjusys',
    component: NavigationComponent,
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./modules/dashboard/dashboard.module')
            .then((m) => m.DashboardModule)
            .catch((error) => {
              console.error('Error loading DashboardModule', error);
              throw error;
            }),
      },
      {
        path: 'students',
        loadChildren: () =>
          import('./modules/students/students.module')
            .then((m) => m.StudentsModule)
            .catch((error) => {
              console.error('Error loading StudentsModule', error);
              throw error;
            }),
      },
      {
        path: 'companies',
        loadChildren: () =>
          import('./modules/companies/companies.module')
            .then((m) => m.CompaniesModule)
            .catch((error) => {
              console.error('Error loading CompaniesModule', error);
              throw error;
            }),
      },
      {
        path: 'drives',
        loadChildren: () =>
          import('./modules/drives/drives.module')
            .then((m) => m.DrivesModule)
            .catch((error) => {
              console.error('Error loading DrivesModule', error);
              throw error;
            }),
      },




    ],
  },
];
