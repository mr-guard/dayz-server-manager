/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CdkScrollableModule, ScrollingModule } from '@angular/cdk/scrolling';

/* Modules */
import { AppCommonModule } from '@common/app-common.module';
import { NavigationModule } from '@modules/navigation/navigation.module';

/* Containers */
import * as containers from './containers';


/* Services */
import * as services from './services';
import { LogMonitorComponent } from './components/log-monitor/log-monitor.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        CdkScrollableModule,
        ScrollingModule,
        ReactiveFormsModule,
        FormsModule,
        AppCommonModule,
        NavigationModule,
    ],
    providers: [
        DecimalPipe,
        ...services.services,
    ],
    declarations: [
        ...containers.containers,
        LogMonitorComponent,
    ],
    exports: [
        ...containers.containers,
        LogMonitorComponent,
    ],
})
export class LogsModule {}
