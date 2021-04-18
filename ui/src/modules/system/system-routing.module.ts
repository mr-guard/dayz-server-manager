/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SBRouteData } from '@modules/navigation/models';

/* Module */
import { SystemModule } from './system.module';

/* Containers */
import * as systemContainers from './containers';

/* Routes */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ROUTES: Routes = [
    {
        path: '',
        canActivate: [],
        component: systemContainers.SystemComponent,
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
