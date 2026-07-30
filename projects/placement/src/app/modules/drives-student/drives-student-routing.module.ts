import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { DrivesStudentComponent } from './drives-student.component';

const routes: Routes = [
  {
    path: '',
    component: DrivesStudentComponent,
    data: {
      breadcrumb: {
        module: 'KJUSYS',
        subModule: 'drives-student',
        url: 'placement/drives-student'
      },
      submenu: true,
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DrivesStudentModuleRoutingModule {}
