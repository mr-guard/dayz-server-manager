/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

/* Module */
import { MaintenanceModule } from './maintenance.module';
import { MaintenanceComponent } from './containers/maintenance/maintenance.component';
import { SBRouteData } from '../navigation/models';

/* Routes */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ROUTES: Routes = [
    {
        path: '',
        canActivate: [],
        component: MaintenanceComponent,
        data: {
            title: 'Maintenance',
            breadcrumbs: [
                {
                    text: 'Dashboard',
                    link: '/dashboard',
                },
                {
                    text: 'Maintenance',
                    active: true,
                },
            ],
        } as SBRouteData,
    },
];

@NgModule({
    imports: [MaintenanceModule, RouterModule.forChild(ROUTES)],
    exports: [RouterModule],
})
export class MaintenanceRoutingModule {}
