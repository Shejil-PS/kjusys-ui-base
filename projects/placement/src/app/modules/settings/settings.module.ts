import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { SettingsModuleRoutingModule } from './settings-routing.module';
import { SettingsComponent } from './settings.component';


import { TabsModule } from '@libs/tabs';

@NgModule({
  declarations: [
    SettingsComponent
  ],
  imports: [
    CommonModule,
    SettingsModuleRoutingModule,
    FormsModule,
    TabsModule
  ]
})
export class SettingsModule { }
