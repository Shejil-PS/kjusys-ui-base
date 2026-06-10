import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { StudentsComponent } from './students.component';



const routes:Routes = [
    {
        path:'',
        component:StudentsComponent,
        data:{
            breadcrumb:{
                module:'KJUSYS',
                subModule: 'students',
                url: 'placement/students'
            },
            submenu:true,
        }
    },
    {
        path:':id',
        component:StudentsComponent,
        data:{
            breadcrumb:{
                module:'KJUSYS',
                subModule: 'students',
                url: 'placement/students'
            },
            submenu:true,
        }
    }
]


@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class StudentsModuleRoutingModule {}
