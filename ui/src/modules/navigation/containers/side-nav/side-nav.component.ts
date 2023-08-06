import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { SideNavItems, SideNavSection } from '../../models';
import { NavigationService } from '../../services/navigation.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'sb-side-nav',
    templateUrl: './side-nav.component.html',
    styleUrls: ['side-nav.component.scss'],
})
export class SideNavComponent implements OnInit, OnDestroy {

    @Input() public sidenavStyle!: string;
    @Input() public sideNavItems!: SideNavItems;
    @Input() public sideNavSections!: SideNavSection[];

    public subscription: Subscription = new Subscription();
    public routeDataSubscription!: Subscription;

    public constructor(
        public navigationService: NavigationService,
    ) {}

    public ngOnInit(): void {
        // ignore
    }

    public ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

}
