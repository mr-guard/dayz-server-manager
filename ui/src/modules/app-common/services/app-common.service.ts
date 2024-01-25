import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LogType, LogTypeEnum, MetricType, MetricTypeEnum, MetricWrapper, ServerInfo, SystemReport, isSameServerInfo } from '../models';
import { AuthService } from '../../auth/services/auth.service';
import Chart from 'chart.js';
import { BehaviorSubject, Observable, of, Subject, Subscription, timer } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

const processError = (err: any, prefix?: string): Observable<any> => {
    let message = '';
    if (err.error instanceof ErrorEvent) {
        message = err.error.message;
    } else {
        message = `Error Code: ${err.status}\nMessage: ${err.message}`;
    }
    console.error(`${prefix ? `${prefix}:` : ''}: ${message}`, err);
    return of(null);
};

type ApiFetcherTypes = LogType | MetricType;
interface Timestamped {
    timestamp: number;
}

export class ApiFetcher<K extends ApiFetcherTypes, T extends Timestamped> {

    private data$ = new BehaviorSubject<T[] | null>(null);
    private dataInserted$ = new Subject<T>();

    private apiPath: string;

    public constructor(
        private httpClient: HttpClient,
        private auth: AuthService,
        private dataType: K,
    ) {
        if (Object.keys(LogTypeEnum).includes(dataType)) {
            this.apiPath = `/api/logs`;
        } else if (Object.keys(MetricTypeEnum).includes(dataType)) {
            this.apiPath = `/api/metrics`;
        } else {
            throw new Error('Unknown data type');
        }
    }

    public get snapshot(): T[] {
        return [...(this.data$.value ?? [])];
    }

    public get lastUpdated(): number {
        const x = this.data$.value;
        return x?.length ? x[x.length - 1].timestamp : 0;
    }

    public get dataInserted(): Observable<T> {
        return this.dataInserted$.asObservable();
    }

    private getLastOf(obs: Observable<T[] | null>): Observable<T | null> {
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

    public get lastUpdate(): Observable<number> {
        return this.getLastOf(this.data$.asObservable())
            .pipe(
                map((x) => x?.timestamp ?? 0),
            );
    }

    public get data(): Observable<T[] | null> {
        return this.data$.asObservable();
    }

    public get latestData(): Observable<T | null> {
        return this.getLastOf(this.data$.asObservable());
    }

    public triggerUpdate(since?: number): void {
        this.fetchFromServer(since).subscribe(
            (next) => {
                if (next) {
                    this.data$.next([
                        ...(this.data$.value ?? []),
                        ...next,
                    ]);
                    next.forEach((x) => this.dataInserted$.next(x));
                }
            },
            console.error,
        );
    }

    private getAuthHeaders(): { [k: string]: string } {
        return this.auth.getAuthHeaders();
    }

    private fetchFromServer(since?: number): Observable<T[]> {
        return this.httpClient.get<T>(
            this.apiPath,
            {
                params: {
                    type: this.dataType,
                    since: String(since ?? 0),
                },
                headers: this.getAuthHeaders(),
                withCredentials: true,
            },
        ).pipe(
            catchError((e) => processError(e, `Failed to fetch ${this.dataType} from ${this.apiPath}`)),
        );
    }

}

@Injectable({ providedIn: 'root' })
export class AppCommonService {

    /* eslint-disable @typescript-eslint/indent */
    private apiFetchers = new Map<
        ApiFetcherTypes,
        ApiFetcher<
            ApiFetcherTypes,
            Timestamped
        >
    >();
    /* eslint-enable @typescript-eslint/indent */

    public readonly SERVER_INFO = new BehaviorSubject<ServerInfo | undefined>(undefined);

    private timer: Subscription | undefined;
    private lastUpdate$: number = 0;

    private refreshRate$: number = 30;

    public constructor(
        private httpClient: HttpClient,
        private auth: AuthService,
    ) {
        const savedRefreshRate = localStorage.getItem('DZSM_REFRESH_RATE');
        if (savedRefreshRate) {
            this.refreshRate$ = Number(savedRefreshRate) || 30;
        }

        (Object.keys(LogTypeEnum) as LogType[]).forEach(
            (x) => {
                this.apiFetchers.set(
                    x,
                    new ApiFetcher<typeof x, any>(
                        this.httpClient,
                        this.auth,
                        x,
                    ),
                );
            },
        );

        (Object.keys(MetricTypeEnum) as MetricType[]).forEach(
            (x) => {
                this.apiFetchers.set(
                    x,
                    new ApiFetcher<typeof x, any>(
                        this.httpClient,
                        this.auth,
                        x,
                    ),
                );
            },
        );

        void this.fetchServerInfo().toPromise();
        this.adjustRefreshRate(this.refreshRate$);
        if (this.refreshRate$ < 0) {
            this.triggerUpdate();
        }
    }

    public get lastUpdate(): number {
        return this.lastUpdate$;
    }

    public get refreshRate(): number {
        return this.refreshRate$;
    }

    public adjustRefreshRate(rate: number): void {
        this.refreshRate$ = rate;
        localStorage.setItem('DZSM_REFRESH_RATE', String(rate));

        if (this.timer && !this.timer.closed) {
            this.timer.unsubscribe();
        }

        if (rate && rate > 0) {
            this.timer = timer(0, this.refreshRate$ * 1000)
                .subscribe(() => {
                    this.triggerUpdate();
                });
        }
    }

    public getApiFetcher<K extends ApiFetcherTypes, T extends Timestamped>(type: ApiFetcherTypes): ApiFetcher<K, T> {
        return this.apiFetchers.get(type)! as unknown as ApiFetcher<K, T>;
    }

    public triggerUpdate(): void {
        this.apiFetchers.forEach((x) => {
            x.triggerUpdate(this.lastUpdate$);
        });
        this.lastUpdate$ = new Date().valueOf();
    }

    private getAuthHeaders(): { [k: string]: string } {
        return this.auth.getAuthHeaders();
    }

    public apiPOST(resource: string, body: any): Observable<string> {
        return this.httpClient.post(
            `/api/${resource}`,
            body,
            {
                headers: this.getAuthHeaders(),
                withCredentials: true,
                responseType: 'text'
            },
        ).pipe(
            catchError((e) => processError(e)),
        );
    }

    public apiGET(resource: string): Observable<string> {
        return this.httpClient.get(
            `/api/${resource}`,
            {
                headers: this.getAuthHeaders(),
                withCredentials: true,
                responseType: 'text'
            },
        ).pipe(
            catchError((e) => processError(e)),
        );
    }

    public fetchManagerConfig(): Observable<string> {
        return this.httpClient.get(
            `/api/config`,
            {
                headers: this.getAuthHeaders(),
                withCredentials: true,
                responseType: 'text'
            },
        ).pipe(
            catchError((e) => processError(e)),
        );
    }

    public updateManagerConfig(config: string): Observable<any> {
        return this.httpClient.post<any>(
            `/api/updateconfig`,
            {
                config,
            },
            {
                headers: this.getAuthHeaders(),
                withCredentials: true,
            },
        );
    }

    public chart(type: 'system' | 'process' | 'manager', metric: 'cpu' | 'ram'): Observable<Chart.ChartConfiguration> {

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

        return this.getApiFetcher<MetricTypeEnum.SYSTEM, MetricWrapper<SystemReport>>(MetricTypeEnum.SYSTEM)!.data.pipe(
            map((values) => {
                let last = 0;
                const lastTime = values?.length ? values[values.length - 1].timestamp : 0;
                const data = values?.filter((x) => {
                    const filtered = (((x.timestamp - last) > 180000) && ((lastTime - x.timestamp) < 3 * 60 * 60 * 1000));
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

    public fetchServerInfo(): Observable<ServerInfo> {
        return this.httpClient.get<ServerInfo>(
            `/api/serverinfo`,
            {
                headers: this.getAuthHeaders(),
                withCredentials: true,
            },
        ).pipe(
            catchError((e) => processError(e)),
            tap((x) => {
                if (!isSameServerInfo(x, this.SERVER_INFO.getValue())) {
                    this.SERVER_INFO.next(x);
                }
            }),
        );
    }

    public fetchMissionFile(file: string): Observable<string> {
        return this.httpClient.get(
            `/api/readmissionfile`,
            {
                headers: this.getAuthHeaders(),
                withCredentials: true,
                params: {
                    file,
                },
                responseType: 'text',
            },
        );
    }

    public fetchMissionFiles(files: string[]): Observable<string[]> {
        return this.httpClient.post<string[]>(
            `/api/readmissionfiles`,
            {
                files,
            },
            {
                headers: this.getAuthHeaders(),
                withCredentials: true,
                observe: 'body',
            },
        );
    }

    public fetchMissionDir(dir: string): Observable<string[]> {
        return this.httpClient.get<string[]>(
            `/api/readmissiondir`,
            {
                headers: this.getAuthHeaders(),
                withCredentials: true,
                params: {
                    dir,
                },
            },
        );
    }

    public updateMissionFile(file: string, content: string, withBackup?: boolean): Observable<any> {
        return this.httpClient.post(
            `/api/writemissionfile`,
            {
                file,
                content,
                withBackup,
            },
            {
                headers: this.getAuthHeaders(),
                withCredentials: true,
                responseType: 'text',
            },
        );
    }

    public fetchProfileFile(file: string): Observable<string> {
        return this.httpClient.get(
            `/api/readprofilefile`,
            {
                headers: this.getAuthHeaders(),
                withCredentials: true,
                params: {
                    file,
                },
                responseType: 'text',
            },
        );
    }

    public fetchProfileFiles(files: string[]): Observable<string[]> {
        return this.httpClient.post<string[]>(
            `/api/readprofilefiles`,
            {
                files,
            },
            {
                headers: this.getAuthHeaders(),
                withCredentials: true,
                observe: 'body',
            },
        );
    }

    public fetchProfileDir(dir: string): Observable<string[]> {
        return this.httpClient.get<string[]>(
            `/api/readprofiledir`,
            {
                headers: this.getAuthHeaders(),
                withCredentials: true,
                params: {
                    dir,
                },
            },
        );
    }

    public updateProfileFile(file: string, content: string, withBackup?: boolean): Observable<any> {
        return this.httpClient.post(
            `/api/writeprofilefile`,
            {
                file,
                content,
                withBackup,
            },
            {
                headers: this.getAuthHeaders(),
                withCredentials: true,
                responseType: 'text',
            },
        );
    }

}
