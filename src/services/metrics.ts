import { Manager } from '../control/manager';
import { MetricType, MetricTypeEnum, MetricWrapper } from '../types/metrics';
import { Logger, LogLevel } from '../util/logger';
import { IStatefulService } from '../types/service';
import { DatabaseTypes } from './database';

export class Metrics implements IStatefulService {

    private log = new Logger('Metrics');

    private initialTimeout = 1000;
    private timeout: any;
    private interval: any;

    public constructor(
        public manager: Manager,
    ) {}

    public async start(): Promise<void> {
        if (this.interval) {
            await this.stop();
        }

        for (const metricKey of Object.keys(MetricTypeEnum)) {
            this.manager.database.getDatabase(DatabaseTypes.METRICS).run(`
                CREATE TABLE IF NOT EXISTS ${metricKey} (
                    timestamp UNSIGNED BIG INT PRIMARY KEY,
                    value TEXT
                );
            `);
        }

        this.timeout = setTimeout(() => {
            this.timeout = undefined;
            this.interval = setInterval(() => {
                void this.tick();
            }, this.manager.config.metricPollIntervall);
        }, this.initialTimeout);
    }

    public async stop(): Promise<void> {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = undefined;
        }
    }

    public async pushMetricValue<T extends MetricWrapper<any>>(type: MetricType, value: T): Promise<void> {
        this.manager.database.getDatabase(DatabaseTypes.METRICS).run(
            `
                INSERT INTO ${type} (timestamp, value) VALUES (?, ?)
            `,
            value.timestamp,
            JSON.stringify(value.value),
        );
    }

    private async pushMetric(type: MetricType, valueFnc: () => Promise<any>): Promise<void> {
        try {
            const value = await valueFnc();
            if (!!value) {
                await this.pushMetricValue(type, {
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

    }

    public deleteMetrics(maxDays: number): void {

        const delTs = new Date().valueOf() - (maxDays * 24 * 60 * 60 * 1000);
        for (const key of Object.keys(MetricTypeEnum)) {
            this.manager.database.getDatabase(DatabaseTypes.METRICS).run(`
                DELETE FROM ${key} WHERE timestamp < ?
            `, delTs);
        }

    }

    public async fetchMetrics(type: MetricType, since?: number): Promise<MetricWrapper<any>[]> {
        return this.manager.database.getDatabase(DatabaseTypes.METRICS).all(
            `
                SELECT * FROM ${type} WHERE timestamp > ? ORDER BY timestamp ASC
            `,
            since ?? 0,
        ).map((x) => {
            return {
                timestamp: x.timestamp,
                value: JSON.parse(x.value),
            };
        });
    }

}
