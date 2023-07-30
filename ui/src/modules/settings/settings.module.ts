/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

/* Modules */
import { AppCommonModule } from '../app-common/app-common.module';
import { NavigationModule } from '../navigation/navigation.module';
import { PlayersModule } from '../players/players.module';
import { SettingsComponent } from './containers/settings/settings.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        FormsModule,
        AppCommonModule,
        NavigationModule,
        PlayersModule,
        NgbModule,
        FontAwesomeModule,
    ],
    providers: [
        DecimalPipe,
    ],
    declarations: [
        SettingsComponent,
    ],
    exports: [
        SettingsComponent,
    ],
})
export class SettingsModule {}
