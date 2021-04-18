/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

/* Module */
import { PlayersModule } from './players.module';

/* Containers */
import * as playersContainers from './containers';

import { SBRouteData } from '@modules/navigation/models';

/* Routes */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ROUTES: Routes = [
    {
        path: '',
        canActivate: [],
        component: playersContainers.PlayersComponent,
        data: {
            title: 'Players',
            breadcrumbs: [
                {
                    text: 'Dashboard',
                    link: '/dashboard',
                },
                {
                    text: 'Players',
                    active: true,
                },
            ],
        } as SBRouteData,
    },
];

@NgModule({
    imports: [PlayersModule, RouterModule.forChild(ROUTES)],
    exports: [RouterModule],
})
export class PlayersRoutingModule {}
