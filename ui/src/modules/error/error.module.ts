/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

/* Modules */
import { AppCommonModule } from '../app-common/app-common.module';
import { NavigationModule } from '../navigation/navigation.module';
import { Error401Component } from './containers/error-401/error-401.component';
import { Error404Component } from './containers/error-404/error-404.component';
import { Error500Component } from './containers/error-500/error-500.component';
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
        Error401Component,
        Error404Component,
        Error500Component,
    ],
    exports: [
        Error401Component,
        Error404Component,
        Error500Component,
    ],
})
export class ErrorModule {}
