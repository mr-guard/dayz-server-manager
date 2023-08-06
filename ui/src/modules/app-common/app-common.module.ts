/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

/* Third Party */
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { IconsModule } from '../icons/icons.module';

import { CardComponent } from './components/card/card.component';
import { CardViewDetailsComponent } from './components/card-view-details/card-view-details.component';
import { DefaultValuePipe } from './pipes/default-value.pipe';

import { HttpClientModule } from '@angular/common/http';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        HttpClientModule,
        IconsModule,
        NgbModule,
    ],
    providers: [],
    declarations: [
        DefaultValuePipe,
        CardComponent,
        CardViewDetailsComponent,
    ],
    exports: [
        DefaultValuePipe,
        CardComponent,
        CardViewDetailsComponent,
    ],
})
export class AppCommonModule {}
