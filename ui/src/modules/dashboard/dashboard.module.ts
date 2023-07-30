/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { NgxGaugeModule } from 'ngx-gauge';
import { AppCommonModule } from '../app-common/app-common.module';
import { NavigationModule } from '../navigation/navigation.module';
import { SystemModule } from '../system/system.module';
import { PlayersModule } from '../players/players.module';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DashboardCardsComponent } from './dashboard-cards/dashboard-cards.component';
import { DashboardPlayersComponent } from './dashboard-players/dashboard-players.component';
import { DashboardSystemComponent } from './dashboard-system/dashboard-system.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';


@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        FormsModule,
        AppCommonModule,
        NavigationModule,
        SystemModule,
        PlayersModule,
        NgxGaugeModule,
        FontAwesomeModule,
        NgbModule,
    ],
    declarations: [
        DashboardComponent,
        DashboardCardsComponent,
        DashboardPlayersComponent,
        DashboardSystemComponent,
    ],
    exports: [
        DashboardComponent,
        DashboardCardsComponent,
        DashboardPlayersComponent,
        DashboardSystemComponent,
    ],
})
export class DashboardModule {}
