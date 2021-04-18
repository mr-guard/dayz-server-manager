import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { AppCommonService } from '@common/services';

@Component({
    selector: 'sb-dashboard-system',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './dashboard-system.component.html',
    styleUrls: ['dashboard-system.component.scss'],
})
export class DashboardSystemComponent implements OnInit {

    public constructor(
        public commonService: AppCommonService,
    ) {}

    public ngOnInit(): void {
        // ignore
    }

}
