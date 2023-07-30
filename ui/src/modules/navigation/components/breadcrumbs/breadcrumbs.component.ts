import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { Breadcrumb } from '../../models';
import { NavigationService } from '../../services/navigation.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'sb-breadcrumbs',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './breadcrumbs.component.html',
    styleUrls: ['breadcrumbs.component.scss'],
})
export class BreadcrumbsComponent implements OnInit, OnDestroy {

    public subscription: Subscription = new Subscription();
    public breadcrumbs!: Breadcrumb[];

    public constructor(public navigationService: NavigationService) {}

    public ngOnInit(): void {
        this.subscription.add(
            this.navigationService.routeData$().subscribe((routeData) => {
                this.breadcrumbs = routeData.breadcrumbs;
            }),
        );
    }

    public ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

}
