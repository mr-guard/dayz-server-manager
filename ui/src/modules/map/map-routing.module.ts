/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

/* Module */
import { MapModule } from './map.module';
import { MapComponent } from './containers/map/map.component';
import { SBRouteData } from '../navigation/models';

/* Routes */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ROUTES: Routes = [
    {
        path: '',
        canActivate: [],
        component: MapComponent,
        data: {
            title: 'Map',
            breadcrumbs: [
                {
                    text: 'Dashboard',
                    link: '/dashboard',
                },
                {
                    text: 'Map',
                    active: true,
                },
            ],
        } as SBRouteData,
    },
];

@NgModule({
    imports: [MapModule, RouterModule.forChild(ROUTES)],
    exports: [RouterModule],
})
export class MapRoutingModule {}
