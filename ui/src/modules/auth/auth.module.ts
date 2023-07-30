/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

/* Modules */
import { AppCommonModule } from '../app-common/app-common.module';
import { NavigationModule } from '../navigation/navigation.module';
import { AuthGuard, LoginGuard } from './guards/auth.guard';
import { LoginComponent } from './containers/login/login.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';


@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        FormsModule,
        AppCommonModule,
        NavigationModule,
        NgbModule,
    ],
    providers: [LoginGuard, AuthGuard],
    declarations: [LoginComponent],
    exports: [LoginComponent],
})
export class AuthModule {}
