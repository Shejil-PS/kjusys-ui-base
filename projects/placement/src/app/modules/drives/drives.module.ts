import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DrivesModuleRoutingModule } from './drives-routing.module';
import { DrivesComponent } from './drives.component';
import { BreadcrumbsTitleComponent, ButtonComponent, MiniFileuploadComponent } from '@libs/shared-ui';
import { DropdownLibModule } from '@libs/dropdown-lib';


@NgModule({
  declarations: [
    DrivesComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    DrivesModuleRoutingModule,
    BreadcrumbsTitleComponent,
    ButtonComponent,
    MiniFileuploadComponent,
    DropdownLibModule
  ]
})
export class DrivesModule { }
