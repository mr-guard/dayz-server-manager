import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    HostBinding,
    Input,
    OnDestroy,
    OnInit,
} from '@angular/core';
import { sideNavItems, sideNavSections } from '@modules/navigation/data';
import { NavigationService } from '@modules/navigation/services';
import { Subscription } from 'rxjs';

@Component({
    selector: 'sb-layout-dashboard',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './layout-dashboard.component.html',
    styleUrls: ['layout-dashboard.component.scss'],
})
export class LayoutDashboardComponent implements OnInit, OnDestroy {

    @Input() public static = false;
    @Input() public light = false;
    @HostBinding('class.sb-sidenav-toggled') public sideNavHidden = false;
    public subscription: Subscription = new Subscription();
    public sideNavItems = sideNavItems;
    public sideNavSections = sideNavSections;
    public sidenavStyle = 'sb-sidenav-dark';

    public constructor(
        public navigationService: NavigationService,
        private changeDetectorRef: ChangeDetectorRef,
    ) {}

    public ngOnInit(): void {
        if (this.light) {
            this.sidenavStyle = 'sb-sidenav-light';
        }
        this.subscription.add(
            this.navigationService.sideNavVisible$().subscribe((isVisible) => {
                this.sideNavHidden = !isVisible;
                this.changeDetectorRef.markForCheck();
            }),
        );
    }

    public ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

}
