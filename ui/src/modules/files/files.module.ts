/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

/* Modules */
import { AppCommonModule } from '@common/app-common.module';
import { NavigationModule } from '@modules/navigation/navigation.module';

/* Containers */
import { containers, renderers } from './containers';


/* Services */
import * as services from './services';
import { PlayersModule } from '@modules/players/players.module';
import { AgGridModule } from 'ag-grid-angular';
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';
import { NgSelectModule } from '@ng-select/ng-select';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        FormsModule,
        AppCommonModule,
        NavigationModule,
        PlayersModule,
        AgGridModule.withComponents([
            ...renderers,
        ]),
        NgMultiSelectDropDownModule.forRoot(),
        NgSelectModule,
    ],
    providers: [
        DecimalPipe,
        ...services.services,
    ],
    declarations: [
        ...containers,
        ...renderers,
    ],
    exports: [
        ...containers,
        ...renderers,
    ],
})
export class FilesModule {}
