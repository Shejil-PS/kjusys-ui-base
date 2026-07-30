import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DashboardStudentModuleRoutingModule } from './dashboard-student-routing.module';
import { DashboardStudentComponent } from './dashboard-student.component';
import { ApplicationsPageComponent } from './applications-page/applications-page.component';
import { BreadcrumbsTitleComponent, ButtonComponent, MiniFileuploadComponent, FileUploadComponent } from '@libs/shared-ui';
import { DropdownLibModule } from '@libs/dropdown-lib';

@NgModule({
  declarations: [
    DashboardStudentComponent,
    ApplicationsPageComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    DashboardStudentModuleRoutingModule,
    BreadcrumbsTitleComponent,
    ButtonComponent,
    MiniFileuploadComponent,
    FileUploadComponent,
    DropdownLibModule
  ]
})
export class DashboardStudentModule { }
