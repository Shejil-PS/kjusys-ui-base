import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CompaniesModuleRoutingModule } from './companies-routing.module';
import { CompaniesComponent } from './companies.component';
import { BreadcrumbsTitleComponent, ButtonComponent } from '@libs/shared-ui';


@NgModule({
  declarations: [
    CompaniesComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    CompaniesModuleRoutingModule,
    BreadcrumbsTitleComponent,
    ButtonComponent
  ]
})
export class CompaniesModule { }
