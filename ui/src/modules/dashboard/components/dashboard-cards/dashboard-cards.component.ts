import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { MetricType, MetricTypeEnum, MetricWrapper, RconPlayer, ServerState, SystemReport } from '@common/models';
import { ApiFetcher, AppCommonService } from '@common/services';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
    selector: 'sb-dashboard-cards',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './dashboard-cards.component.html',
    styleUrls: ['dashboard-cards.component.scss'],
})
export class DashboardCardsComponent implements OnInit {

    public constructor(
        public commonService: AppCommonService,
    ) {}

    public ngOnInit(): void {
        // ignore
    }

    public serverStateToStyle(s?: ServerState): string {
        switch (s) {
            case ServerState.STARTED: {
                return 'bg-success';
            }
            case ServerState.STARTING: {
                return 'bg-warn';
            }
            default: {
                return 'bg-danger';
            }
        }
    }

    public get playerStream(): Observable<MetricWrapper<RconPlayer[]> | null> {
        return this.getFetcher(MetricTypeEnum.PLAYERS).latestData;
    }

    public get systemStream(): Observable<MetricWrapper<SystemReport> | null> {
        return this.getFetcher(MetricTypeEnum.SYSTEM).latestData;
    }

    public get memStream(): Observable<number> {
        return this.systemStream.pipe(
            map((x) => {
                if (x?.value?.system) {
                    const sys = x?.value?.system;
                    if (sys.mem && sys.memTotal) {
                        return (sys.mem / sys.memTotal) * 100;
                    }
                }
                return 0;
            }),
        );
    }

    private getFetcher(type: MetricType): ApiFetcher<MetricType, MetricWrapper<any>> {
        return this.commonService.getApiFetcher<MetricType, MetricWrapper<any>>(type);
    }

}
