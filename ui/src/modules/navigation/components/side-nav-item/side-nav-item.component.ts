import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { SBRouteData, SideNavItem } from '@modules/navigation/models';

@Component({
    selector: 'sb-side-nav-item',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './side-nav-item.component.html',
    styleUrls: ['side-nav-item.component.scss'],
})
export class SideNavItemComponent implements OnInit {

    @Input() public sideNavItem!: SideNavItem;
    @Input() public isActive!: boolean;

    public expanded = false;
    public routeData!: SBRouteData;

    public ngOnInit(): void {
        // ignore
    }

}
