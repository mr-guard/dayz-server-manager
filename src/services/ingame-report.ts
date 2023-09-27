import { Manager } from '../control/manager';
import { IngameReportContainer } from '../types/ingame-report';
import { MetricTypeEnum } from '../types/metrics';
import * as path from 'path';
import { Paths } from '../services/paths';
import { LogLevel } from '../util/logger';
import { IStatefulService } from '../types/service';
import { inject, injectable, singleton } from 'tsyringe';
import { LoggerFactory } from './loggerfactory';
import { Metrics } from './metrics';
import { FSAPI, InjectionTokens } from '../util/apis';
import { EventBus } from '../control/event-bus';
import { InternalEventTypes } from '../types/events';

@singleton()
@injectable()
export class IngameReport extends IStatefulService {

    public readonly MOD_NAME = '@DayZServerManager';
    public readonly MOD_NAME_EXPANSION = '@DayZServerManagerExpansion';
    public readonly TICK_FILE = 'DZSM-TICK.json';

    public readonly EXPANSION_VEHICLES_MOD_ID = '2291785437';
    public readonly EXPANSION_BUNDLE_MOD_ID = '2572331007';

    public intervalTimeout: number = 1000;
    public readTimeout: number = 1000;
    private lastTickTimestamp: number = 0;
    private tickFilePath: string;

    public constructor(
        loggerFactory: LoggerFactory,
        private manager: Manager,
        private metrics: Metrics,
        private paths: Paths,
        private eventBus: EventBus,
        @inject(InjectionTokens.fs) private fs: FSAPI,
    ) {
        super(loggerFactory.createLogger('IngameReport'));

        this.eventBus.on(
            InternalEventTypes.INTERNAL_MOD_INSTALL,
            /* istanbul ignore next */ () => this.installMod(),
        );
        this.eventBus.on(
            InternalEventTypes.GET_INTERNAL_MODS,
            /* istanbul ignore next */ async () => this.getServerMods(),
        );
    }

    public async start(): Promise<void> {

        this.tickFilePath = path.join(
            this.manager.getProfilesPath(),
            this.TICK_FILE,
        );

        this.timers.addInterval('scanTick', () => {
            void this.scanTick();
        }, this.intervalTimeout);
    }

    public async stop(): Promise<void> {
        this.timers.removeAllTimers();
    }

    private async scanTick(): Promise<void> {
        if (this.manager.config.ingameReportViaRest) {
            return;
        }
        try {
            if (this.fs.existsSync(this.tickFilePath)) {
                const stat = this.fs.statSync(this.tickFilePath);
                const modified = stat.mtime.getTime();

                // eslint-disable-next-line no-negated-condition
                if (modified !== this.lastTickTimestamp) {
                    this.lastTickTimestamp = modified;
                    await new Promise((r) => setTimeout(r, this.readTimeout));

                    const content = `${this.fs.readFileSync(this.tickFilePath)}`;
                    const parsed = JSON.parse(content);

                    await this.processIngameReport(parsed);
                } else {
                    this.log.log(LogLevel.DEBUG, `Ingame report file not modified`);
                }
            } else {
                this.log.log(LogLevel.DEBUG, `Ingame report file not found`);
            }
        } catch (e) {
            this.log.log(LogLevel.ERROR, `Error trying to scan for ingame report file`, e);
        }
    }

    public async processIngameReport(report: IngameReportContainer): Promise<void> {
        const timestamp = new Date().valueOf();

        this.log.log(LogLevel.INFO, `Server sent ingame report: ${report?.players?.length ?? 0} players, ${report?.vehicles?.length ?? 0} vehicles`);

        void this.metrics.pushMetricValue(
            MetricTypeEnum.INGAME_PLAYERS,
            {
                timestamp,
                value: report?.players ?? [],
            },
        );

        void this.metrics.pushMetricValue(
            MetricTypeEnum.INGAME_VEHICLES,
            {
                timestamp,
                value: report?.vehicles ?? [],
            },
        );
    }

    public async installMod(): Promise<void> {

        if (this.manager.config.ingameReportEnabled === false) {
            return;
        }

        const serverPath = this.manager.getServerPath();

        const modsPath = path.join(__dirname, '../mods');
        const mods = this.fs.readdirSync(modsPath);

        for (const mod of mods) {
            const serverModPath = path.join(serverPath, mod);
            if (this.fs.existsSync(serverModPath)) {
                if (!this.paths.removeLink(serverModPath)) {
                    this.log.log(LogLevel.ERROR, `Could not remove mod ${mod} before copying new files`);
                    return;
                }
            }
        }

        this.paths.copyFromPkg(modsPath, serverPath);

    }

    public getServerMods(): string[] {

        if (this.manager.config.ingameReportEnabled === false) {
            return [];
        }

        const mods = [this.MOD_NAME];
        if (
            (
                this.manager.getModIdList().includes(this.EXPANSION_VEHICLES_MOD_ID)
                || this.manager.getModIdList().includes(this.EXPANSION_BUNDLE_MOD_ID)
            )
            && this.manager.config.ingameReportExpansionCompat !== false
        ) {
            mods.push(this.MOD_NAME_EXPANSION);
        }
        return mods;
    }

}
