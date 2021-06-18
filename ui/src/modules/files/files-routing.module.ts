/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

/* Module */
import { FilesModule } from './files.module';

/* Containers */
import * as containers from './containers';
import { SBRouteData } from '@modules/navigation/models';

/* Routes */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ROUTES: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'types',
    },
    {
        path: 'types',
        canActivate: [],
        component: containers.TypesComponent,
        data: {
            title: 'Files',
            breadcrumbs: [
                {
                    text: 'Dashboard',
                    link: '/dashboard',
                },
                {
                    text: 'Files',
                    link: '/files',
                },
                {
                    text: 'Types',
                    active: true,
                },
            ],
        } as SBRouteData,
    },
    {
        path: '**',
        pathMatch: 'full',
        redirectTo: 'types',
    },
];

@NgModule({
    imports: [FilesModule, RouterModule.forChild(ROUTES)],
    exports: [RouterModule],
})
export class FilesRoutingModule {}
