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

@singleton()
@injectable()
export class IngameReport extends IStatefulService {

    public readonly MOD_NAME = '@DayZServerManager';
    public readonly MOD_NAME_EXPANSION = '@DayZServerManagerExpansion';
    public readonly TICK_FILE = 'DZSM-TICK.json';

    public readonly EXPANSION_VEHICLES_MOD_ID = '2291785437';

    private interval: any;
    public intervalTimeout: number = 1000;
    public readTimeout: number = 1000;
    private lastTickTimestamp: number = 0;
    private tickFilePath: string;

    public constructor(
        loggerFactory: LoggerFactory,
        private manager: Manager,
        private metrics: Metrics,
        private paths: Paths,
        @inject(InjectionTokens.fs) private fs: FSAPI,
    ) {
        super(loggerFactory.createLogger('IngameReport'));
    }

    public async start(): Promise<void> {

        const baseDir = this.manager.getServerPath();
        const profiles = this.manager.config.profilesPath;
        if (profiles) {
            if (path.isAbsolute(profiles)) {
                this.tickFilePath = path.join(profiles, this.TICK_FILE);
            } else {
                this.tickFilePath = path.join(baseDir, profiles, this.TICK_FILE);
            }
        }

        this.interval = setInterval(() => {
            void this.scanTick();
        }, this.intervalTimeout);
    }

    public async stop(): Promise<void> {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = undefined;
        }
    }

    private async scanTick(): Promise<void> {
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
            this.manager.getModIdList().includes(this.EXPANSION_VEHICLES_MOD_ID)
            && this.manager.config.ingameReportExpansionCompat !== false
        ) {
            mods.push(this.MOD_NAME_EXPANSION);
        }
        return mods;
    }

}
