/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SBRouteData } from '../navigation/models';

/* Module */
import { SystemModule } from './system.module';
import { SystemComponent } from './containers/system/system.component';

/* Routes */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ROUTES: Routes = [
    {
        path: '',
        canActivate: [],
        component: SystemComponent,
        data: {
            title: 'System',
            breadcrumbs: [
                {
                    text: 'Dashboard',
                    link: '/dashboard',
                },
                {
                    text: 'System',
                    active: true,
                },
            ],
        } as SBRouteData,
    },
];

@NgModule({
    imports: [SystemModule, RouterModule.forChild(ROUTES)],
    exports: [RouterModule],
})
export class SystemRoutingModule {}
