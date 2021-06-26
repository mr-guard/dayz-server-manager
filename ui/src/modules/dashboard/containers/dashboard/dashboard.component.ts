import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { MetricTypeEnum, MetricWrapper, SystemReport } from '@common/models';
import { AppCommonService } from '@common/services';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'sb-dashboard',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './dashboard.component.html',
    styleUrls: ['dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {

    private componentDestroy: Subject<void> | undefined = new Subject();

    public systemMetrics: MetricWrapper<SystemReport>[] = [];

    public constructor(
        public commonService: AppCommonService,
    ) {}

    public ngOnDestroy(): void {
        if (this.componentDestroy) {
            this.componentDestroy.next();
            this.componentDestroy.complete();
            this.componentDestroy = undefined;
        }
    }

    public ngOnInit(): void {
        this.commonService.getApiFetcher<
        MetricTypeEnum.SYSTEM,
        MetricWrapper<SystemReport>
        >(MetricTypeEnum.SYSTEM).data
            .pipe(
                takeUntil(this.componentDestroy!),
            )
            .subscribe(
                (next) => {
                    if (next) {
                        this.systemMetrics = next;
                    }
                },
                console.error,
            );
    }

}
