import { AfterViewInit, Component, HostListener, Input, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { LogMessage, LogType } from '../../../app-common/models';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { ApiFetcher, AppCommonService } from '../../../../modules/app-common/services/app-common.service';

@Component({
    selector: 'sb-log-monitor',
    templateUrl: './log-monitor.component.html',
    styleUrls: ['./log-monitor.component.scss'],
})
export class LogMonitorComponent implements OnInit, OnDestroy, AfterViewInit {

    public title: string = 'Logs';
    @ViewChild('scrollView') public container!: any;
    public itemSize = 1;
    public lockToEnd: boolean = true;

    public messages: LogMessage[] = [];
    public sub?: Subscription;

    public constructor(
        private zone: NgZone,
        private appCommon: AppCommonService,
        private route: ActivatedRoute,
    ) {}

    private getFetcher(type: LogType): ApiFetcher<LogType, LogMessage> {
        return this.appCommon.getApiFetcher<LogType, LogMessage>(type);
    }

    public ngOnInit(): void {

        const logType = this.route.snapshot.data['logType'] as LogType;
        if (!logType) return;

        this.title = this.route.snapshot.data['title'];
        const logFetcher = this.getFetcher(logType);

        this.messages = [...(logFetcher.snapshot ?? [])];
        this.scrollToBottom();
        this.sub = logFetcher.dataInserted.subscribe(
            (x) => {
                this.messages = [...this.messages, x];
                this.scrollToBottom();
            },
            console.error,
        );
    }

    public ngOnDestroy(): void {
        if (this.sub) {
            this.sub.unsubscribe();
            this.sub = undefined;
        }
    }

    public ngAfterViewInit(): void {
        this.scrollToBottom();
    }

    private scrollToBottom(force?: boolean): void {
        if (!this.container?.elementRef?.nativeElement || (!this.lockToEnd && !force)) return;
        const { scrollHeight } = this.container.elementRef.nativeElement;
        this.container.elementRef.nativeElement.scrollTop = scrollHeight;
        this.zone.run(() => {
            setTimeout(() => {
                if (this.container.elementRef.nativeElement.scrollHeight !== scrollHeight) {
                    this.scrollToBottom();
                }
            }, 1000);
        });
    }

    public toggleLock(): void {
        this.lockToEnd = !this.lockToEnd;
    }

    @HostListener('window:resize')
    public onResize(): void {
        // console.warn('test', this.container);
    }

}
