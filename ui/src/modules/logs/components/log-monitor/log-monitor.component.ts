import { AfterViewInit, ChangeDetectionStrategy, Component, Input, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { LogMessage } from '@common/models';
import { Observable, Subscription } from 'rxjs';

@Component({
    selector: 'sb-log-monitor',
    templateUrl: './log-monitor.component.html',
    styleUrls: ['./log-monitor.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogMonitorComponent implements OnInit, OnDestroy, AfterViewInit {

    @Input() public title: string = 'Logs';
    @Input() public logStream!: Observable<LogMessage>;
    @Input() public history: LogMessage[] = [];
    @ViewChild('scrollView') public container!: any;

    public lockToEnd: boolean = true;

    public messages: LogMessage[] = [];
    public sub?: Subscription;

    public constructor(
        private zone: NgZone,
    ) { }

    public ngOnInit(): void {
        this.messages = [...(this.history ?? [])];
        this.scrollToBottom();
        this.sub = this.logStream.subscribe(
            (x) => {
                this.messages.push(x);
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
        console.log('auto-scroll');
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

}
