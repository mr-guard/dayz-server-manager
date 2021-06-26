import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { MetricType, MetricWrapper, MetricTypeEnum } from '@common/models';
import { ApiFetcher, AppCommonService } from '@common/services';

@Component({
    selector: 'sb-system',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './system.component.html',
    styleUrls: ['system.component.scss'],
})
export class SystemComponent implements OnInit {

    public constructor(
        public commonService: AppCommonService,
    ) {}

    public ngOnInit(): void {
        // ignore
    }

    private getFetcher(type: MetricType): ApiFetcher<MetricType, MetricWrapper<any>> {
        return this.commonService.getApiFetcher<MetricType, MetricWrapper<any>>(type);
    }

    public getPlayerFetcher(): ApiFetcher<MetricType, MetricWrapper<any>> {
        return this.getFetcher(MetricTypeEnum.PLAYERS);
    }

    public getSystemFetcher(): ApiFetcher<MetricType, MetricWrapper<any>> {
        return this.getFetcher(MetricTypeEnum.SYSTEM);
    }

}
