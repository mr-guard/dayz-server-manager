import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuditEvent, Config, LogMessage, MetricWrapper, RconPlayer, SystemReport } from '@common/models';
import { AuthService } from '@modules/auth/services';
import Chart from 'chart.js';
import { environment } from 'environments/environment';
import { BehaviorSubject, Observable, of, Subject, Subscription, timer } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AppCommonService {

    private playerMetrics$ = new BehaviorSubject<MetricWrapper<RconPlayer[]>[] | null>(null);
    private systemMetrics$ = new BehaviorSubject<MetricWrapper<SystemReport>[] | null>(null);
    private auditMetrics$ = new BehaviorSubject<AuditEvent[] | null>(null);

    private rptLogs$ = new Subject<LogMessage>();
    private currentRptLogs$: LogMessage[] = [];
    private scriptLogs$ = new Subject<LogMessage>();
    private currentScriptLogs$: LogMessage[] = [];
    private admLogs$ = new Subject<LogMessage>();
    private currentAdmLogs$: LogMessage[] = [];

    private timer: Subscription | undefined;
    private lastUpdate: number = 0;

    private refreshRate = 30;

    public constructor(
        private httpClient: HttpClient,
        private auth: AuthService,
    ) {
        this.adjustRefreshRate(this.refreshRate);
    }

    public getRefreshRate(): number {
        return this.refreshRate;
    }

    public adjustRefreshRate(rate: number): void {
        this.refreshRate = rate;

        if (this.timer && !this.timer.closed) {
            this.timer.unsubscribe();
        }

        this.timer = timer(0, this.refreshRate * 1000)
            .subscribe(() => {
                this.triggerUpdate();
            });
    }

    public get playerMetrics(): Observable<MetricWrapper<RconPlayer[]>[] | null> {
        return this.playerMetrics$.asObservable();
    }

    public get systemMetrics(): Observable<MetricWrapper<SystemReport>[] | null> {
        return this.systemMetrics$.asObservable();
    }

    public get auditMetrics(): Observable<AuditEvent[] | null> {
        return this.auditMetrics$.asObservable();
    }

    public get lastUpdateSystem(): Observable<number> {
        return this.systemMetrics$.asObservable()
            .pipe(
                map((x) => x?.length ? x[x.length - 1].timestamp : 0),
            );
    }

    public get lastUpdatePlayers(): Observable<number> {
        return this.playerMetrics$.asObservable()
            .pipe(
                map((x) => x?.length ? x[x.length - 1].timestamp : 0),
            );
    }

    private getLastOf<T>(obs: Observable<T[] | null>): Observable<T | null> {
        return obs
            .pipe(
                map((x) => {
                    if (x?.length) {
                        return x[x.length - 1];
                    }
                    return null;
                }),
            );
    }

    public get currentPlayers(): Observable<MetricWrapper<RconPlayer[]> | null> {
        return this.getLastOf(this.playerMetrics$.asObservable());
    }

    public get currentSystem(): Observable<MetricWrapper<SystemReport> | null> {
        return this.getLastOf(this.systemMetrics$.asObservable());
    }

    public get currentRptLogs(): LogMessage[] {
        return [...this.currentRptLogs$];
    }

    public get rptLogs(): Observable<LogMessage> {
        return this.rptLogs$.asObservable();
    }

    public get currentAdmLogs(): LogMessage[] {
        return [...this.currentAdmLogs$];
    }

    public get admLogs(): Observable<LogMessage> {
        return this.admLogs$.asObservable();
    }

    public get currentScriptLogs(): LogMessage[] {
        return [...this.currentScriptLogs$];
    }

    public get scriptLogs(): Observable<LogMessage> {
        return this.scriptLogs$.asObservable();
    }

    public triggerUpdate(): void {
        this.updatePlayerMetrics(this.lastUpdate);
        this.updateSystemMetrics(this.lastUpdate);
        this.updateAuditMetrics(this.lastUpdate);
        this.updateRptLogs(this.lastUpdate);
        this.updateScriptLogs(this.lastUpdate);
        this.updateAdmLogs(this.lastUpdate);
        this.lastUpdate = new Date().valueOf();
    }

    public updatePlayerMetrics(since?: number): void {
        this.fetchPlayerMetrics(since).subscribe(
            (next) => {
                if (next) {
                    this.playerMetrics$.next([...(this.playerMetrics$.getValue() ?? []), ...next]);
                }
            },
            console.error,
        );
    }

    public updateSystemMetrics(since?: number): void {
        this.fetchSystemMetrics(since).subscribe(
            (next) => {
                if (next) {
                    this.systemMetrics$.next([...(this.systemMetrics$.getValue() ?? []), ...next]);
                }
            },
            console.error,
        );
    }

    public updateAuditMetrics(since?: number): void {
        this.fetchAuditMetrics(since).subscribe(
            (next) => {
                if (next) {
                    this.auditMetrics$.next([...(this.auditMetrics$.getValue() ?? []), ...next]);
                }
            },
            console.error,
        );
    }

    public updateRptLogs(since?: number): void {
        this.fetchRptLogs(since).subscribe(
            (next) => {
                if (next) {
                    this.currentRptLogs$ = [...(this.currentRptLogs$ ?? []), ...next];
                    next.forEach((x) => this.rptLogs$.next(x));
                }
            },
            console.error,
        );
    }

    public updateAdmLogs(since?: number): void {
        this.fetchAdmLogs(since).subscribe(
            (next) => {
                if (next) {
                    this.currentAdmLogs$ = [...(this.currentAdmLogs$ ?? []), ...next];
                    next.forEach((x) => this.admLogs$.next(x));
                }
            },
            console.error,
        );
    }

    public updateScriptLogs(since?: number): void {
        this.fetchScriptLogs(since).subscribe(
            (next) => {
                if (next) {
                    this.currentScriptLogs$ = [...(this.currentScriptLogs$ ?? []), ...next];
                    next.forEach((x) => this.scriptLogs$.next(x));
                }
            },
            console.error,
        );
    }

    private getAuthHeaders(): { [k: string]: string } {
        return this.auth.getAuthHeaders();
    }

    private fetchPlayerMetrics(since?: number): Observable<MetricWrapper<RconPlayer[]>[]> {
        return this.httpClient.get<MetricWrapper<RconPlayer[]>[]>(
            `${environment.host}/api/metrics`,
            {
                params: {
                    type: 'PLAYERS',
                    since: String(since ?? 0),
                },
                headers: this.getAuthHeaders(),
                withCredentials: true,
            },
        ).pipe(
            catchError((e) => this.processError(e)),
        );
    }

    public fetchSystemMetrics(since?: number): Observable<MetricWrapper<SystemReport>[]> {
        return this.httpClient.get<MetricWrapper<SystemReport>[]>(
            `${environment.host}/api/metrics`,
            {
                params: {
                    type: 'SYSTEM',
                    since: String(since ?? 0),
                },
                headers: this.getAuthHeaders(),
                withCredentials: true,
            },
        ).pipe(
            catchError((e) => this.processError(e)),
        );
    }

    public fetchAuditMetrics(since?: number): Observable<AuditEvent[]> {
        return this.httpClient.get<AuditEvent[]>(
            `${environment.host}/api/metrics`,
            {
                params: {
                    type: 'AUDIT',
                    since: String(since ?? 0),
                },
                headers: this.getAuthHeaders(),
                withCredentials: true,
            },
        ).pipe(
            catchError((e) => this.processError(e)),
        );
    }

    public fetchRptLogs(since?: number): Observable<LogMessage[]> {
        return this.httpClient.get<LogMessage[]>(
            `${environment.host}/api/logs`,
            {
                params: {
                    type: 'RPT',
                    since: String(since ?? 0),
                },
                headers: this.getAuthHeaders(),
                withCredentials: true,
            },
        ).pipe(
            catchError((e) => this.processError(e)),
        );
    }

    public fetchAdmLogs(since?: number): Observable<LogMessage[]> {
        return this.httpClient.get<LogMessage[]>(
            `${environment.host}/api/logs`,
            {
                params: {
                    type: 'Adm',
                    since: String(since ?? 0),
                },
                headers: this.getAuthHeaders(),
                withCredentials: true,
            },
        ).pipe(
            catchError((e) => this.processError(e)),
        );
    }

    public fetchScriptLogs(since?: number): Observable<LogMessage[]> {
        return this.httpClient.get<LogMessage[]>(
            `${environment.host}/api/logs`,
            {
                params: {
                    type: 'SCRIPT',
                    since: String(since ?? 0),
                },
                headers: this.getAuthHeaders(),
                withCredentials: true,
            },
        ).pipe(
            catchError((e) => this.processError(e)),
        );
    }

    public processError(err: any): Observable<any> {
        let message = '';
        if (err.error instanceof ErrorEvent) {
            message = err.error.message;
        } else {
            message = `Error Code: ${err.status}\nMessage: ${err.message}`;
        }
        console.error(message, err);
        return of(null);
    }

    public fetchManagerConfig(): Observable<Config> {
        return this.httpClient.get<Config>(
            `${environment.host}/api/config`,
            {
                headers: this.getAuthHeaders(),
                withCredentials: true,
            },
        ).pipe(
            catchError((e) => this.processError(e)),
        );
    }

    public updateManagerConfig(config: Config): Observable<any> {
        return this.httpClient.post<any>(
            `${environment.host}/api/updateconfig`,
            {
                config,
            },
            {
                headers: this.getAuthHeaders(),
                withCredentials: true,
            },
        );
    }

    public chart(type: 'system' | 'process' | 'manager', metric: 'cpu' | 'ram'): Observable<Chart.ChartConfiguration | null> {

        const dataMapper = {
            system: {
                cpu: (x: MetricWrapper<SystemReport>) => {
                    return x.value.system.cpuTotal;
                },
                ram: (x: MetricWrapper<SystemReport>) => {
                    return Math.round((x.value.system.mem / x.value.system.memTotal!) * 100);
                },
            },
            process: {
                cpu: (x: MetricWrapper<SystemReport>) => {
                    return x.value.server?.cpuTotal ?? 0;
                },
                ram: (x: MetricWrapper<SystemReport>) => {
                    return Math.round(((x.value.server?.mem ?? 0) / x.value.system.memTotal!) * 100);
                },
            },
            manager: {
                cpu: (x: MetricWrapper<SystemReport>) => {
                    return x.value.manager.cpuTotal;
                },
                ram: (x: MetricWrapper<SystemReport>) => {
                    return Math.round((x.value.manager.mem / x.value.system.memTotal!) * 100);
                },
            },
        }[type][metric];

        return this.systemMetrics.pipe(
            map((values) => {

                if (!values?.length) return null;

                let last = 0;
                const data = values?.filter((x) => {
                    const filtered = (((x.timestamp - last) > 180000) && ((values[values.length - 1].timestamp - x.timestamp) < 3 * 60 * 60 * 1000));
                    if (filtered) {
                        last = x.timestamp;
                    }
                    return filtered;
                }) ?? [];
                return {
                    type: 'line',
                    data: {
                        labels: data.map((x) => {
                            return new Date(x.timestamp).toLocaleTimeString();
                        }),
                        datasets: [
                            {
                                label: `${metric.toUpperCase()} Usage`,
                                lineTension: 0.2,
                                backgroundColor: 'rgba(2,117,216,0.2)',
                                borderColor: 'rgba(2,117,216,1)',
                                pointRadius: 2,
                                pointBackgroundColor: 'rgba(2,117,216,1)',
                                pointBorderColor: 'rgba(255,255,255,0.8)',
                                pointHoverRadius: 5,
                                pointHoverBackgroundColor: 'rgba(2,117,216,1)',
                                pointHitRadius: 5,
                                pointBorderWidth: 2,
                                data: data.map(dataMapper),
                            },
                        ],
                    },
                    options: {
                        animation: {
                            duration: 0,
                        },
                        scales: {
                            xAxes: [
                                {
                                    time: {
                                        unit: 'second',
                                    },
                                    gridLines: {
                                        display: false,
                                    },
                                    ticks: {
                                        maxTicksLimit: 7,
                                    },
                                },
                            ],
                            yAxes: [
                                {
                                    ticks: {
                                        min: 0,
                                        max: 100,
                                        // maxTicksLimit: 5,
                                    },
                                    gridLines: {
                                        color: 'rgba(0, 0, 0, .125)',
                                    },
                                },
                            ],
                        },
                        legend: {
                            display: false,
                        },
                    },
                };
            }),
        );

    }

}
