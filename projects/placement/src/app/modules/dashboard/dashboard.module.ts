import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DashboardModuleRoutingModule } from './dashboard-routing.module';
import { DashboardComponent, CardComponent } from './dashboard.component';


@NgModule({
  declarations: [
    DashboardComponent,
    CardComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    DashboardModuleRoutingModule
  ]
})
export class DashboardModule { }
