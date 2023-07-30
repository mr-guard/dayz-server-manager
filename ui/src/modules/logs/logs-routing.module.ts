/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

/* Module */
import { LogsModule } from './logs.module';

/* Containers */
import { SBRouteData } from '../navigation/models';
import { LogsComponent } from './containers/logs/logs.component';

/* Routes */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ROUTES: Routes = [
    {
        path: '',
        canActivate: [],
        component: LogsComponent,
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
