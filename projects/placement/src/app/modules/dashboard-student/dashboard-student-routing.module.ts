import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { DashboardStudentComponent } from './dashboard-student.component';
import { ApplicationsPageComponent } from './applications-page/applications-page.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardStudentComponent,
    data: {
      breadcrumb: {
        module: 'KJUSYS',
        subModule: 'dashboard-student',
        url: 'placement/dashboard-student'
      },
      submenu: true,
    }
  },
  {
    path: 'applications',
    component: ApplicationsPageComponent,
    data: {
      breadcrumb: {
        module: 'KJUSYS',
        subModule: 'applications',
        url: 'placement/dashboard-student/applications'
      },
      submenu: true,
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardStudentModuleRoutingModule {}
