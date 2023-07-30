/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

/* Modules */
import { AppCommonModule } from '../app-common/app-common.module';
import { BreadcrumbsComponent } from './components/breadcrumbs/breadcrumbs.component';
import { DashboardHeadComponent } from './components/dashboard-head/dashboard-head.component';
import { SideNavComponent } from './containers/side-nav/side-nav.component';
import { SideNavItemComponent } from './components/side-nav-item/side-nav-item.component';
import { FooterComponent } from './containers/footer/footer.component';
import { TopNavComponent } from './containers/top-nav/top-nav.component';
import { LayoutErrorComponent } from './layouts/layout-error/layout-error.component';
import { LayoutDashboardComponent } from './layouts/layout-dashboard/layout-dashboard.component';
import { LayoutAuthComponent } from './layouts/layout-auth/layout-auth.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        AppCommonModule,
        FontAwesomeModule,
    ],
    declarations: [
        BreadcrumbsComponent,
        DashboardHeadComponent,
        SideNavItemComponent,
        SideNavComponent,
        FooterComponent,
        TopNavComponent,
        LayoutAuthComponent,
        LayoutDashboardComponent,
        LayoutErrorComponent,
    ],
    exports: [
        BreadcrumbsComponent,
        DashboardHeadComponent,
        SideNavItemComponent,
        SideNavComponent,
        FooterComponent,
        TopNavComponent,
        LayoutAuthComponent,
        LayoutDashboardComponent,
        LayoutErrorComponent,
    ],
})
export class NavigationModule {}
