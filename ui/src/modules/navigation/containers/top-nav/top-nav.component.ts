import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { AppCommonService } from '@common/services';
import { AuthService } from '@modules/auth/services';
import { Breadcrumb } from '@modules/navigation/models';
import { NavigationService } from '@modules/navigation/services';
import { Subscription } from 'rxjs';

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
