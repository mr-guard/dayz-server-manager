import { Manager } from '../control/manager';
import { MetricType, MetricTypeEnum, MetricWrapper } from '../types/metrics';
import { LogLevel } from '../util/logger';
import { IStatefulService } from '../types/service';
import { Database, DatabaseTypes } from './database';
import { delay, inject, injectable, singleton } from 'tsyringe';
import { LoggerFactory } from './loggerfactory';
import { RCON } from './rcon';
import { SystemReporter } from './monitor';

@singleton()
@injectable()
export class Metrics extends IStatefulService {

    public constructor(
        loggerFactory: LoggerFactory,
        private database: Database,
    ) {
        super(loggerFactory.createLogger('Metrics'));
    }

    public async start(): Promise<void> {
        for (const metricKey of Object.keys(MetricTypeEnum)) {
            this.database.getDatabase(DatabaseTypes.METRICS).run(`
                CREATE TABLE IF NOT EXISTS ${metricKey} (
                    timestamp UNSIGNED BIG INT PRIMARY KEY,
                    value TEXT
                );
            `);
        }
    }

    public async stop(): Promise<void> {
        // nothing
    }

    public async pushMetricValue<T extends MetricWrapper<any>>(type: MetricType, value: T): Promise<void> {
        this.database.getDatabase(DatabaseTypes.METRICS).run(
            `
                INSERT INTO ${type} (timestamp, value) VALUES (?, ?)
            `,
            value.timestamp,
            JSON.stringify(value.value),
        );
    }

    public deleteMetrics(maxAge: number): void {

        const delTs = new Date().valueOf() - maxAge;
        for (const key of Object.keys(MetricTypeEnum)) {
            this.database.getDatabase(DatabaseTypes.METRICS).run(`
                DELETE FROM ${key} WHERE timestamp < ?
            `, delTs);
        }

    }

    public async fetchMetrics(type: MetricType, since?: number): Promise<MetricWrapper<any>[]> {
        return this.database.getDatabase(DatabaseTypes.METRICS).all(
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

@singleton()
@injectable()
export class MetricsCollector extends IStatefulService {

    public initialTimeout = 1000;
    private timeout: any;
    private interval: any;

    public constructor(
        loggerFactory: LoggerFactory,
        private manager: Manager,
        private metrics: Metrics,
        private rcon: RCON,
        @inject(delay(() => SystemReporter)) private systemReporter: SystemReporter,
    ) {
        super(loggerFactory.createLogger('MetricsCollector'));
    }

    public async start(): Promise<void> {
        if (this.interval) {
            await this.stop();
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

    private async tick(): Promise<void> {

        this.log.log(LogLevel.DEBUG, 'Tick');

        await this.pushMetric(MetricTypeEnum.PLAYERS, () => this.rcon.getPlayers());

        await this.pushMetric(MetricTypeEnum.SYSTEM, () => this.systemReporter.getSystemReport());

        if (this.manager.config.metricMaxAge && this.manager.config.metricMaxAge > 0) {
            this.metrics.deleteMetrics(this.manager.config.metricMaxAge);
        }

    }

    private async pushMetric(type: MetricType, valueFnc: () => Promise<any>): Promise<void> {
        try {
            const value = await valueFnc();
            if (!!value) {
                await this.metrics.pushMetricValue(type, {
                    timestamp: new Date().valueOf(),
                    value,
                });
            }
        } catch {
            // ignore
        }
    }

}
