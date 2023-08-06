/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

/* Modules */
import { AppCommonModule } from '../app-common/app-common.module';
import { NavigationModule } from '../navigation/navigation.module';
import { SystemComponent } from './containers/system/system.component';
import { ChartsAreaComponent } from './components/charts-area/charts-area.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        FormsModule,
        AppCommonModule,
        NavigationModule,
        FontAwesomeModule,
    ],
    declarations: [
        SystemComponent,
        ChartsAreaComponent,
    ],
    exports: [
        SystemComponent,
        ChartsAreaComponent,
    ],
})
export class SystemModule {}
