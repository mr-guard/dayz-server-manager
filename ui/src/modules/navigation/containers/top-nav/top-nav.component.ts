import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Breadcrumb } from '../../models';
import { NavigationService } from '../../services/navigation.service';
import { AuthService } from '../../../auth/services/auth.service';
import { AppCommonService } from '../../../../modules/app-common/services/app-common.service';

@Component({
    selector: 'sb-top-nav',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './top-nav.component.html',
    styleUrls: ['top-nav.component.scss'],
})
export class TopNavComponent implements OnInit, OnDestroy {

    public refreshRate: string = '30';

    public subscription: Subscription = new Subscription();
    public breadcrumbs!: Breadcrumb[];
    public title: string = '';

    public constructor(
        private navigationService: NavigationService,
        private auth: AuthService,
        private appCommon: AppCommonService,
    ) {}

    public ngOnInit(): void {
        this.refreshRate = String(this.appCommon.refreshRate);
        this.subscription.add(
            this.navigationService.routeData$().subscribe((routeData) => {
                this.breadcrumbs = routeData.breadcrumbs;
                if (this.breadcrumbs?.length) {
                    this.title = this.breadcrumbs[this.breadcrumbs.length - 1].text;
                } else {
                    this.title = '';
                }
            }),
        );
    }

    public toggleSideNav(): void {
        this.navigationService.toggleSideNav();
    }

    public logout(): void {
        void this.auth.logout();
    }

    public onRefreshRateChange(val: string): void {
        this.refreshRate = val;

        this.appCommon.adjustRefreshRate(Number(val));
    }

    public refreshNow(): void {
        this.appCommon.triggerUpdate();
    }

    public ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

}
