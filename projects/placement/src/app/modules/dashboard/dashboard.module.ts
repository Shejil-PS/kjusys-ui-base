import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DashboardModuleRoutingModule } from './dashboard-routing.module';
import { DashboardComponent, CardComponent } from './dashboard.component';
import { BreadcrumbsTitleComponent, ButtonComponent } from '@libs/shared-ui';
import { DropdownLibModule } from '@libs/dropdown-lib';

@NgModule({
  declarations: [
    DashboardComponent,
    CardComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    DashboardModuleRoutingModule,
    BreadcrumbsTitleComponent,
    ButtonComponent,
    DropdownLibModule
  ]
})
export class DashboardModule { }
