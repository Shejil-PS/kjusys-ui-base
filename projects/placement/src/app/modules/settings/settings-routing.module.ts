import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { SettingsComponent } from './settings.component';



const routes:Routes = [
    {
        path:'',
        component:SettingsComponent,
        data:{
            breadcrumb:{
                module:'KJUSYS',
                subModule: 'settings',
                url: 'placement/settings'
            },
            submenu:true,
        }
    }
]


@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class SettingsModuleRoutingModule {}
