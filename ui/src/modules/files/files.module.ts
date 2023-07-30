/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

/* Modules */
import { AppCommonModule } from '../app-common/app-common.module';
import { NavigationModule } from '../navigation/navigation.module';
import { AgGridModule } from 'ag-grid-angular';
import { NgSelectModule } from '@ng-select/ng-select';
import { PlayersModule } from '../players/players.module';
import { CategoryRenderer, CheckboxRenderer, TypesComponent, UsageRenderer, ValueRenderer } from './containers/types/types.component';
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
        PlayersModule,
        AgGridModule,
        NgSelectModule,
        FontAwesomeModule,
        NgbModule,
    ],
    providers: [
        DecimalPipe,
    ],
    declarations: [
        CategoryRenderer,
        ValueRenderer,
        UsageRenderer,
        CheckboxRenderer,
        TypesComponent,
    ],
    exports: [
        CategoryRenderer,
        ValueRenderer,
        UsageRenderer,
        CheckboxRenderer,
        TypesComponent,
    ],
})
export class FilesModule {}
