import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { MetricWrapper } from '@common/models';
import { AppCommonService } from '@common/services';

@Component({
    selector: 'sb-dashboard',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './dashboard.component.html',
    styleUrls: ['dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {

    public systemMetrics: MetricWrapper<any>[] = [];

    public constructor(
        public commonService: AppCommonService,
    ) {}

    public ngOnInit(): void {
        this.commonService.fetchSystemMetrics().subscribe(
            (next) => {
                this.systemMetrics = next;
            },
            console.error,
        );
    }

}
