import { Manager } from '../control/manager';
import * as fs from 'fs';
import * as zlip from 'zlib';
import { MetricsContainer, MetricType, MetricWrapper } from '../types/metrics';
import { Logger, LogLevel } from '../util/logger';
import { StatefulService } from '../types/service';
import { merge } from '../util/merge';

export class Metrics implements StatefulService {

    private static log = new Logger('Metrics');
    private static readonly METRICS_FILE = 'server-manager-metrics';

    private interval: any;
    private tickCount: number = 0;

    /* eslint-disable @typescript-eslint/naming-convention */
    private metricsContainer: MetricsContainer = {
        AUDIT: [],
        PLAYERS: [],
        SYSTEM: [],
    };
    /* eslint-disable @typescript-eslint/naming-convention */

    private ingame: any[] = [];

    public constructor(
        public manager: Manager,
    ) {}

    public async start(): Promise<void> {
        if (this.interval) {
            await this.stop();
        }

        await this.readMetrics();

        this.tickCount = 0;
        setTimeout(() => {
            this.interval = setInterval(() => {
                void this.tick();
            }, this.manager.config.metricPollIntervall);
        }, 1000);
    }

    public async stop(): Promise<void> {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = undefined;
        }
    }

    public pushMetricValue<T extends MetricWrapper<any>>(type: keyof typeof MetricType, value: T): void {
        if (this.metricsContainer[type].length) {
            const firstTS = this.metricsContainer[type][0].timestamp;
            if ((new Date().valueOf() - firstTS) > this.manager.config.metricMaxAge) {
                this.metricsContainer[type].shift();
            }
        }
        this.metricsContainer[type].push(value);
    }

    private async pushMetric(type: keyof typeof MetricType, valueFnc: () => Promise<any>): Promise<void> {
        try {
            const value = await valueFnc();
            if (!!value) {
                this.pushMetricValue(type, {
                    timestamp: new Date().valueOf(),
                    value,
                });
            }
        } catch {
            // ignore
        }
    }

    private async tick(): Promise<void> {

        Metrics.log.log(LogLevel.DEBUG, 'Tick');

        await this.pushMetric(MetricType.PLAYERS, () => this.manager.rcon.getPlayers());

        await this.pushMetric(MetricType.SYSTEM, () => this.manager.monitor.getSystemReport());

        if ((this.tickCount++ % 10) === 0) {
            this.writeMetrics();
        }

    }

    public deleteMetrics(maxDays: number): void {
        const delTs = new Date().valueOf() - (maxDays * 24 * 60 * 60 * 1000);
        for (const key of Object.keys(MetricType)) {
            this.metricsContainer[key] = this.metricsContainer[key as MetricType]
                .filter((x) => x.timestamp >= delTs);
        }
        this.writeMetrics();
    }

    private writeMetrics(): void {
        zlip.brotliCompress(
            JSON.stringify(this.metricsContainer!),
            (err, compressed) => {
                if (err) {
                    Metrics.log.log(LogLevel.ERROR, 'Failed to compress metrics', err);
                    return;
                }
                fs.writeFile(
                    Metrics.METRICS_FILE,
                    compressed,
                    (writeErr) => {
                        if (writeErr) {
                            Metrics.log.log(LogLevel.ERROR, 'Failed to write metrics', writeErr);
                        }
                    },
                );
            },
        );
    }

    private async readMetrics(): Promise<void> {
        try {
            if (!fs.existsSync(Metrics.METRICS_FILE)) {
                return;
            }
            const content = await new Promise<Buffer>(
                (r, e) => fs.readFile(
                    Metrics.METRICS_FILE,
                    (err, data) => {
                        if (err) {
                            e(err);
                        }
                        r(data);
                    },
                ),
            );
            this.metricsContainer = merge(
                this.metricsContainer,
                JSON.parse(zlip.brotliDecompressSync(content).toString()),
            );
        } catch {
            // ignore
        }
    }

    public get metrics(): MetricsContainer {
        return this.metricsContainer;
    }

    public async fetchMetrics(type: keyof typeof MetricType, since?: number): Promise<MetricWrapper<any>[]> {
        return since ? this.metrics[type].filter((x) => x.timestamp > since) : this.metrics[type];
    }

    public async pushIngameStats(stats: any): Promise<void> {
        this.ingame.push(stats);
    }

}
