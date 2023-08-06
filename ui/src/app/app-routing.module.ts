import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthModule } from '../modules/auth/auth.module';
import { AuthGuard, LoginGuard } from '../modules/auth/guards/auth.guard';

const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
    },
    {
        path: 'dashboard',
        canActivate: [AuthGuard],
        loadChildren: () =>
            import('../modules/dashboard/dashboard-routing.module').then(
                (m) => m.DashboardRoutingModule,
            ),
    },
    {
        path: 'dashboard/system',
        canActivate: [AuthGuard],
        loadChildren: () =>
            import('../modules/system/system-routing.module').then((m) => m.SystemRoutingModule),
    },
    {
        path: 'dashboard/players',
        canActivate: [AuthGuard],
        loadChildren: () =>
            import('../modules/players/players-routing.module').then((m) => m.PlayersRoutingModule),
    },
    {
        path: 'dashboard/audit',
        canActivate: [AuthGuard],
        loadChildren: () =>
            import('../modules/audit/audit-routing.module').then((m) => m.AuditRoutingModule),
    },
    {
        path: 'dashboard/logs',
        canActivate: [AuthGuard],
        loadChildren: () =>
            import('../modules/logs/logs-routing.module').then((m) => m.LogsRoutingModule),
    },
    {
        path: 'dashboard/maintenance',
        canActivate: [AuthGuard],
        loadChildren: () =>
            import('../modules/maintenance/maintenance-routing.module').then((m) => m.MaintenanceRoutingModule),
    },
    {
        path: 'dashboard/settings',
        canActivate: [AuthGuard],
        loadChildren: () =>
            import('../modules/settings/settings-routing.module').then((m) => m.SettingsRoutingModule),
    },
    {
        path: 'dashboard/map',
        canActivate: [AuthGuard],
        loadChildren: () =>
            import('../modules/map/map-routing.module').then((m) => m.MapRoutingModule),
    },
    {
        path: 'dashboard/files',
        canActivate: [AuthGuard],
        loadChildren: () =>
            import('../modules/files/files-routing.module').then((m) => m.FilesRoutingModule),
    },
    // {
    //     path: 'dashboard/version',
    //     loadChildren: () =>
    //         import('modules/utility/utility-routing.module').then((m) => m.UtilityRoutingModule),
    // },
    {
        path: 'login',
        canActivate: [LoginGuard],
        loadChildren: () =>
            import('../modules/auth/auth-routing.module').then((m) => m.AuthRoutingModule),
    },
    // {
    //     path: 'error',
    //     loadChildren: () =>
    //         import('modules/error/error-routing.module').then(m => m.ErrorRoutingModule),
    // },
    {
        path: '**',
        pathMatch: 'full',
        redirectTo: 'dashboard',
        // loadChildren: () =>
        //     import('modules/error/error-routing.module').then(m => m.ErrorRoutingModule),
    },
];

@NgModule({
    imports: [
        RouterModule.forRoot(
            routes,
            {
                onSameUrlNavigation: 'reload'
            },
        ),
        AuthModule,
    ],
    exports: [RouterModule],
})
export class AppRoutingModule {}
