/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

/* Module */
import { LogsModule } from './logs.module';

/* Containers */
import * as containers from './containers';
import { SBRouteData } from '@modules/navigation/models';

/* Routes */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ROUTES: Routes = [
    {
        path: '',
        canActivate: [],
        component: containers.LogsComponent,
        data: {
            title: 'Logs',
            breadcrumbs: [
                {
                    text: 'Dashboard',
                    link: '/dashboard',
                },
                {
                    text: 'Logs',
                    active: true,
                },
            ],
        } as SBRouteData,
    },
];

@NgModule({
    imports: [LogsModule, RouterModule.forChild(ROUTES)],
    exports: [RouterModule],
})
export class LogsRoutingModule {}
