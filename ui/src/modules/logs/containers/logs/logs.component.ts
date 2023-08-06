import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { LogMessage} from '../../../app-common/models';

@Component({
    selector: 'sb-logs',
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
        this.activeTab$ = tab;
    }

    public ngOnInit(): void {
        // ignore
    }

}
