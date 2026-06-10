import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { CompaniesComponent } from './companies.component';



const routes:Routes = [
    {
        path:'',
        component:CompaniesComponent,
        data:{
            breadcrumb:{
                module:'KJUSYS',
                subModule: 'companies',
                url: 'placement/companies'
            },
            submenu:true,
        }
    },
    {
        path:':id',
        component:CompaniesComponent,
        data:{
            breadcrumb:{
                module:'KJUSYS',
                subModule: 'companies',
                url: 'placement/companies'
            },
            submenu:true,
        }
    }
]


@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class CompaniesModuleRoutingModule {}
