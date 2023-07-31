/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

/* Module */
import { LogsModule } from './logs.module';

/* Containers */
import { SBRouteData } from '../navigation/models';
import { LogsComponent } from './containers/logs/logs.component';
import { LogMonitorComponent } from './components/log-monitor/log-monitor.component';
import { LogTypeEnum } from '../app-common/models';

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
        children: [
            {
                path: '',
                redirectTo: 'rpt',
                pathMatch: 'full',
            },
            {
                path: 'rpt',
                canActivate: [],
                component: LogMonitorComponent,
                data: {
                    title: 'RPT Logs',
                    logType: LogTypeEnum.RPT,
                    breadcrumbs: [
                        {
                            text: 'Dashboard',
                            link: '/dashboard',
                        },
                        {
                            text: 'Logs',
                        },
                        {
                            text: 'RPT',
                            active: true,
                        },
                    ],
                } as SBRouteData,
            },
            {
                path: 'adm',
                canActivate: [],
                component: LogMonitorComponent,
                data: {
                    title: 'ADM Logs',
                    logType: LogTypeEnum.ADM,
                    breadcrumbs: [
                        {
                            text: 'Dashboard',
                            link: '/dashboard',
                        },
                        {
                            text: 'Logs',
                        },
                        {
                            text: 'ADM',
                            active: true,
                        },
                    ],
                } as SBRouteData,
            },
            {
                path: 'script',
                canActivate: [],
                component: LogMonitorComponent,
                data: {
                    title: 'Script Logs',
                    logType: LogTypeEnum.SCRIPT,
                    breadcrumbs: [
                        {
                            text: 'Dashboard',
                            link: '/dashboard',
                        },
                        {
                            text: 'Logs',
                        },
                        {
                            text: 'Script',
                            active: true,
                        },
                    ],
                } as SBRouteData,
            },
            {
                path: '**',
                redirectTo: 'rpt',
                pathMatch: 'full',
            },
        ],
    },
];

@NgModule({
    imports: [LogsModule, RouterModule.forChild(ROUTES)],
    exports: [RouterModule],
})
export class LogsRoutingModule {}
