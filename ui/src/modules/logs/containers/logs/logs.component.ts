import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { LogMessage } from '@common/models';
import { AppCommonService } from '@common/services';
import { Observable } from 'rxjs';

@Component({
    selector: 'sb-logs',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './logs.component.html',
    styleUrls: ['logs.component.scss'],
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
        this.rptLogs = this.appCommon.currentRptLogs;
        this.admLogs = this.appCommon.currentAdmLogs;
        this.scriptLogs = this.appCommon.currentScriptLogs;
    }

    public get rptStream(): Observable<LogMessage> {
        return this.appCommon.rptLogs;
    }

    public get admStream(): Observable<LogMessage> {
        return this.appCommon.admLogs;
    }

    public get scriptStream(): Observable<LogMessage> {
        return this.appCommon.scriptLogs;
    }

    public ngOnInit(): void {
        // ignore
    }

}
