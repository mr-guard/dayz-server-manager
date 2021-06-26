/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

/* Modules */
import { AppCommonModule } from '@common/app-common.module';
import { NavigationModule } from '@modules/navigation/navigation.module';

/* Containers */
import * as containers from './containers';


/* Services */
import * as services from './services';

import { LeafletModule } from '@asymmetrik/ngx-leaflet';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        FormsModule,
        AppCommonModule,
        NavigationModule,
        LeafletModule,
    ],
    providers: [
        DecimalPipe,
        ...services.services,
    ],
    declarations: [
        ...containers.containers,
    ],
    exports: [
        ...containers.containers,
    ],
})
export class MapModule {}
