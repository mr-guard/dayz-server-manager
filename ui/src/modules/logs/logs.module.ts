/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CdkScrollableModule, ScrollingModule } from '@angular/cdk/scrolling';

/* Modules */
import { AppCommonModule } from '../app-common/app-common.module';
import { NavigationModule } from '../navigation/navigation.module';


/* Services */
import { LogMonitorComponent } from './components/log-monitor/log-monitor.component';
import { LogsComponent } from './containers/logs/logs.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

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
        NgbModule,
        FontAwesomeModule,
    ],
    providers: [
        DecimalPipe,
    ],
    declarations: [
        LogsComponent,
        LogMonitorComponent,
    ],
    exports: [
        LogsComponent,
        LogMonitorComponent,
    ],
})
export class LogsModule {}
