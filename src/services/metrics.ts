import { MetricType, MetricTypeEnum, MetricWrapper } from '../types/metrics';
import { IStatefulService } from '../types/service';
import { Database, DatabaseTypes } from './database';
import { injectable, singleton } from 'tsyringe';
import { LoggerFactory } from './loggerfactory';

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
