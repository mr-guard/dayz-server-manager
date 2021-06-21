import { ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { LogMessage, LogType, LogTypeEnum } from '@common/models';
import { ApiFetcher, AppCommonService } from '@common/services';
import { Observable } from 'rxjs';

@Component({
    selector: 'sb-logs',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './logs.component.html',
    styleUrls: ['logs.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class LogsComponent implements OnInit {

    public rptLogs: LogMessage[] = [];
    public admLogs: LogMessage[] = [];
    public scriptLogs: LogMessage[] = [];

    private activeTab$: number = 1;
    public get activeTab(): number {
        return this.activeTab$;
    }

    public set activeTab(tab: number) {
        console.log(tab);
        this.activeTab$ = tab;
    }

    public constructor(
        private appCommon: AppCommonService,
    ) {
        this.rptLogs = this.getFetcher(LogTypeEnum.RPT).snapshot;
        this.admLogs = this.getFetcher(LogTypeEnum.ADM).snapshot;
        this.scriptLogs = this.getFetcher(LogTypeEnum.SCRIPT).snapshot;
    }

    public get rptStream(): Observable<LogMessage> {
        return this.getFetcher(LogTypeEnum.RPT).dataInserted;
    }

    public get admStream(): Observable<LogMessage> {
        return this.getFetcher(LogTypeEnum.ADM).dataInserted;
    }

    public get scriptStream(): Observable<LogMessage> {
        return this.getFetcher(LogTypeEnum.SCRIPT).dataInserted;
    }

    private getFetcher(type: LogType): ApiFetcher<LogType, LogMessage> {
        return this.appCommon.getApiFetcher<LogType, LogMessage>(type);
    }

    public ngOnInit(): void {
        // ignore
    }

}
