/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

/* Modules */
import { AppCommonModule } from '@common/app-common.module';
import { NavigationModule } from '@modules/navigation/navigation.module';

/* Components */
import * as playersComponents from './components';

/* Containers */
import * as playersContainers from './containers';

/* Directives */
import * as playersDirectives from './directives';

/* Services */
import * as playersServices from './services';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        FormsModule,
        AppCommonModule,
        NavigationModule,
    ],
    providers: [
        DecimalPipe,
        ...playersServices.services,
        ...playersDirectives.directives,
    ],
    declarations: [
        ...playersContainers.containers,
        ...playersComponents.components,
        ...playersDirectives.directives,
    ],
    exports: [
        ...playersContainers.containers,
        ...playersComponents.components,
    ],
})
export class PlayersModule {}
