/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

/* Modules */
import { AppCommonModule } from '@common/app-common.module';
import { NavigationModule } from '@modules/navigation/navigation.module';

/* Containers */
import * as auditContainers from './containers';


/* Services */
import * as auditServices from './services';
import { PlayersModule } from '@modules/players/players.module';
import { AuditTableComponent } from './components/audit-table/audit-table.component';

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
        ...auditServices.services,
    ],
    declarations: [
        ...auditContainers.containers,
        AuditTableComponent,
    ],
    exports: [
        ...auditContainers.containers,
        AuditTableComponent,
    ],
})
export class AuditModule {}
