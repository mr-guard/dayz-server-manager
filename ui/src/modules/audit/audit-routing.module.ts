/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

/* Module */
import { AuditModule } from './audit.module';

/* Containers */
import * as auditContainers from './containers';
import { SBRouteData } from '@modules/navigation/models';

/* Routes */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ROUTES: Routes = [
    {
        path: '',
        canActivate: [],
        component: auditContainers.AuditComponent,
        data: {
            title: 'Audit',
            breadcrumbs: [
                {
                    text: 'Dashboard',
                    link: '/dashboard',
                },
                {
                    text: 'Audit',
                    active: true,
                },
            ],
        } as SBRouteData,
    },
];

@NgModule({
    imports: [AuditModule, RouterModule.forChild(ROUTES)],
    exports: [RouterModule],
})
export class AuditRoutingModule {}
