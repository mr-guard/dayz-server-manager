import { Manager } from '../control/manager';
import { MetricType, MetricTypeEnum } from '../types/metrics';
import { LogLevel } from '../util/logger';
import { IStatefulService } from '../types/service';
import { injectable, singleton } from 'tsyringe';
import { LoggerFactory } from './loggerfactory';
import { RCON } from './rcon';
import { SystemReporter } from './system-reporter';
import { Metrics } from './metrics';

@singleton()
@injectable()
export class MetricsCollector extends IStatefulService {

    public initialTimeout = 1000;

    public constructor(
        loggerFactory: LoggerFactory,
        private manager: Manager,
        private metrics: Metrics,
        private rcon: RCON,
        private systemReporter: SystemReporter,
    ) {
        super(loggerFactory.createLogger('MetricsCollector'));
    }

    public async start(): Promise<void> {
        await this.stop();

        this.timers.addTimeout(
            'initialTimeout',
            () => {
                this.timers.removeTimer('initialTimeout');
                this.timers.addInterval('tick', () => {
                    void this.tick();
                }, this.manager.config.metricPollIntervall);
            },
            this.initialTimeout,
        );
    }

    public async stop(): Promise<void> {
        this.timers.removeAllTimers();
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
        } catch (e) {
            this.log.log(LogLevel.WARN, 'Failed to evaluate or push metric', e);
        }
    }

}
