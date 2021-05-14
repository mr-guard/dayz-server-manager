import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { AppCommonService } from '@common/services';
import { AuthService } from '@modules/auth/services';
import { NavigationService } from '@modules/navigation/services';

@Component({
    selector: 'sb-top-nav',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './top-nav.component.html',
    styleUrls: ['top-nav.component.scss'],
})
export class TopNavComponent implements OnInit {

    public refreshRate: string = '30';

    public constructor(
        private navigationService: NavigationService,
        private auth: AuthService,
        private appCommon: AppCommonService,
    ) {}

    public ngOnInit(): void {
        this.refreshRate = String(this.appCommon.refreshRate);
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

}
