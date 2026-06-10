import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CompaniesModuleRoutingModule } from './companies-routing.module';
import { CompaniesComponent } from './companies.component';


@NgModule({
  declarations: [
    CompaniesComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    CompaniesModuleRoutingModule
  ]
})
export class CompaniesModule { }
