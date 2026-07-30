import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DrivesStudentModuleRoutingModule } from './drives-student-routing.module';
import { DrivesStudentComponent } from './drives-student.component';
import { BreadcrumbsTitleComponent, ButtonComponent, MiniFileuploadComponent } from '@libs/shared-ui';

@NgModule({
  declarations: [
    DrivesStudentComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    DrivesStudentModuleRoutingModule,
    BreadcrumbsTitleComponent,
    ButtonComponent,
    MiniFileuploadComponent
  ]
})
export class DrivesStudentModule { }
