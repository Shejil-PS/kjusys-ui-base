import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DrivesModuleRoutingModule } from './drives-routing.module';
import { DrivesComponent } from './drives.component';


@NgModule({
  declarations: [
    DrivesComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    DrivesModuleRoutingModule
  ]
})
export class DrivesModule { }
