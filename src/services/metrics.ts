import { Manager } from '../control/manager';
import * as fs from 'fs';
import * as zlip from 'zlib';
import { MetricsContainer, MetricType, MetricTypeEnum, MetricWrapper } from '../types/metrics';
import { Logger, LogLevel } from '../util/logger';
import { IStatefulService } from '../types/service';
import { merge } from '../util/merge';
import { reverseIndexSearch } from '../util/reverse-index-search';

export class Metrics implements IStatefulService {

    private static readonly METRICS_FILE = 'server-manager-metrics';

    private log = new Logger('Metrics');

    private interval: any;
    private tickCount: number = 0;

    /* eslint-disable @typescript-eslint/naming-convention */
    private metricsContainer: MetricsContainer = {
        AUDIT: [],
        PLAYERS: [],
        SYSTEM: [],
        INGAME_PLAYERS: [],
        INGAME_VEHICLES: [],
    };
    /* eslint-disable @typescript-eslint/naming-convention */

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

    public pushMetricValue<T extends MetricWrapper<any>>(type: MetricType, value: T): void {
        if (this.metricsContainer[type].length) {
            const firstTS = this.metricsContainer[type][0].timestamp;
            if ((new Date().valueOf() - firstTS) > this.manager.config.metricMaxAge) {
                this.metricsContainer[type].shift();
            }
        }
        this.metricsContainer[type].push(value);
    }

    private async pushMetric(type: MetricType, valueFnc: () => Promise<any>): Promise<void> {
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

        this.log.log(LogLevel.DEBUG, 'Tick');

        await this.pushMetric(MetricTypeEnum.PLAYERS, () => this.manager.rcon.getPlayers());

        await this.pushMetric(MetricTypeEnum.SYSTEM, () => this.manager.monitor.getSystemReport());

        if ((this.tickCount++ % 10) === 0) {
            this.writeMetrics();
        }

    }

    public deleteMetrics(maxDays: number): void {
        const delTs = new Date().valueOf() - (maxDays * 24 * 60 * 60 * 1000);
        for (const key of Object.keys(MetricTypeEnum)) {
            this.metricsContainer[key] = this.metricsContainer[key as MetricTypeEnum]
                .filter((x) => x.timestamp >= delTs);
        }
        this.writeMetrics();
    }

    private writeMetrics(): void {
        zlip.brotliCompress(
            JSON.stringify(this.metricsContainer!),
            (err, compressed) => {
                if (err) {
                    this.log.log(LogLevel.ERROR, 'Failed to compress metrics', err);
                    return;
                }
                fs.writeFile(
                    Metrics.METRICS_FILE,
                    compressed,
                    (writeErr) => {
                        if (writeErr) {
                            this.log.log(LogLevel.ERROR, 'Failed to write metrics', writeErr);
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

    public async fetchMetrics(type: MetricType, since?: number): Promise<MetricWrapper<any>[]> {
        if (since && since > 0) {
            const idx = reverseIndexSearch(this.metrics[type], (x) => x.timestamp <= since);
            if (idx !== -1) {
                if (idx + 1 >= this.metrics[type].length) {
                    return [];
                }
                return this.metrics[type].slice(idx + 1);
            }
        }
        return this.metrics[type];
    }

}
