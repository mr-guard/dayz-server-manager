/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

/* Third Party */
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { IconsModule } from '@modules/icons/icons.module';

const thirdParty = [IconsModule, NgbModule];

/* Containers */
import * as appCommonContainers from './containers';

/* Components */
import * as appCommonComponents from './components';

/* Guards */
import * as appCommonGuards from './guards';

import { DefaultValuePipe } from './pipes/default-value.pipe';

import { HttpClientModule } from '@angular/common/http';

@NgModule({
    imports: [CommonModule, RouterModule, HttpClientModule, ...thirdParty],
    providers: [...appCommonGuards.guards],
    declarations: [...appCommonContainers.containers, ...appCommonComponents.components, DefaultValuePipe],
    exports: [...appCommonContainers.containers, ...appCommonComponents.components, ...thirdParty, DefaultValuePipe],
})
export class AppCommonModule {}
