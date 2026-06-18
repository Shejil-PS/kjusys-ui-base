import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { SettingsModuleRoutingModule } from './settings-routing.module';
import { SettingsComponent } from './settings.component';


@NgModule({
  declarations: [
    SettingsComponent
  ],
  imports: [
    CommonModule,
    SettingsModuleRoutingModule,
    FormsModule
  ]
})
export class SettingsModule { }
