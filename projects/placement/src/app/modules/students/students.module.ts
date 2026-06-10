import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { StudentsModuleRoutingModule } from './students-routing.module';
import { StudentsComponent } from './students.component';


@NgModule({
  declarations: [
    StudentsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    StudentsModuleRoutingModule
  ]
})
export class StudentsModule { }
