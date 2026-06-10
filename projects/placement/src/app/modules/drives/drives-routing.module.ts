import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { DrivesComponent } from './drives.component';



const routes:Routes = [
    {
        path:'',
        component:DrivesComponent,
        data:{
            breadcrumb:{
                module:'KJUSYS',
                subModule: 'drives',
                url: 'placement/drives'
            },
            submenu:true,
        }
    }
]


@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class DrivesModuleRoutingModule {}
