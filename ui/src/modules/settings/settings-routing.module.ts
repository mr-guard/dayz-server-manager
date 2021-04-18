/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

/* Module */
import { SettingsModule } from './settings.module';

/* Containers */
import * as containers from './containers';
import { SBRouteData } from '@modules/navigation/models';

/* Routes */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ROUTES: Routes = [
    {
        path: '',
        canActivate: [],
        component: containers.SettingsComponent,
        data: {
            title: 'Settings',
            breadcrumbs: [
                {
                    text: 'Dashboard',
                    link: '/dashboard',
                },
                {
                    text: 'Settings',
                    active: true,
                },
            ],
        } as SBRouteData,
    },
];

@NgModule({
    imports: [SettingsModule, RouterModule.forChild(ROUTES)],
    exports: [RouterModule],
})
export class SettingsRoutingModule {}
