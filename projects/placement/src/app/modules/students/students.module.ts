import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { StudentsModuleRoutingModule } from './students-routing.module';
import { StudentsComponent } from './students.component';
import { BreadcrumbsTitleComponent, ButtonComponent } from '@libs/shared-ui';


@NgModule({
  declarations: [
    StudentsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    StudentsModuleRoutingModule,
    BreadcrumbsTitleComponent,
    ButtonComponent
  ]
})
export class StudentsModule { }
