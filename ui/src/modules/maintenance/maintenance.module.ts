/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

/* Modules */
import { AppCommonModule } from '@common/app-common.module';
import { NavigationModule } from '@modules/navigation/navigation.module';

/* Containers */
import * as maintenanceContainers from './containers';


/* Services */
import * as maintenanceServices from './services';
import { PlayersModule } from '@modules/players/players.module';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        FormsModule,
        AppCommonModule,
        NavigationModule,
        PlayersModule,
    ],
    providers: [
        DecimalPipe,
        ...maintenanceServices.services,
    ],
    declarations: [
        ...maintenanceContainers.containers,
    ],
    exports: [
        ...maintenanceContainers.containers,
    ],
})
export class MaintenanceModule {}
