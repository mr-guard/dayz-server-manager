/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

/* Module */
import { PlayersModule } from './players.module';
import { PlayersComponent } from './containers/players/players.component';
import { SBRouteData } from '../navigation/models';

/* Routes */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ROUTES: Routes = [
    {
        path: '',
        canActivate: [],
        component: PlayersComponent,
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
