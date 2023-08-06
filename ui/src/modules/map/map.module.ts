/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

/* Modules */
import { AppCommonModule } from '../app-common/app-common.module';
import { NavigationModule } from '../navigation/navigation.module';

import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { MapComponent } from './containers/map/map.component';

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
    ],
    declarations: [
        MapComponent,
    ],
    exports: [
        MapComponent,
    ],
})
export class MapModule {}
