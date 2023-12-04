/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

/* Modules */
import { AppCommonModule } from '../app-common/app-common.module';
import { NavigationModule } from '../navigation/navigation.module';

import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { LeafletMarkerClusterModule } from '@asymmetrik/ngx-leaflet-markercluster';
import { MapComponent } from './containers/map/map.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { MapLootComponent } from './containers/map/map-loot.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        FormsModule,
        AppCommonModule,
        NavigationModule,
        LeafletModule,
        LeafletMarkerClusterModule,
        FontAwesomeModule,
        NgbModule,
    ],
    providers: [
        DecimalPipe,
    ],
    declarations: [
        MapComponent,
        MapLootComponent,
    ],
    exports: [
        MapComponent,
        MapLootComponent,
    ],
})
export class MapModule {}
