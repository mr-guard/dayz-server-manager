import { Component, OnInit } from '@angular/core';
import { MetricType, MetricTypeEnum, MetricWrapper, RconPlayer, ServerState, SystemReport } from '../../app-common/models';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiFetcher, AppCommonService } from '../../app-common/services/app-common.service';

@Component({
    selector: 'sb-dashboard-cards',
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
                return 'bg-warning';
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
