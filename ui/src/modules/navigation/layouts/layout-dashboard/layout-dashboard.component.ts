import {
    ChangeDetectorRef,
    Component,
    HostBinding,
    Input,
    OnDestroy,
    OnInit,
} from '@angular/core';
import { NavigationService } from '../../services/navigation.service';
import { Subscription } from 'rxjs';
import { sideNavItems, sideNavSections } from '../../data/side-nav.data';

@Component({
    selector: 'sb-layout-dashboard',
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
