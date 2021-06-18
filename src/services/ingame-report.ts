import { Manager } from '../control/manager';
import { IngameReportContainer } from '../types/ingame-report';
import { MetricTypeEnum } from '../types/metrics';
import * as path from 'path';
import * as fs from 'fs';
import { Paths } from '../util/paths';
import { Logger, LogLevel } from '../util/logger';
import { IStatefulService } from '../types/service';

export class IngameReport implements IStatefulService {

    public readonly MOD_NAME = '@DayZServerManager';
    public readonly MOD_NAME_EXPANSION = '@DayZServerManagerExpansion';
    public readonly TICK_FILE = 'DZSM-TICK.json';

    public readonly EXPANSION_VEHICLES_MOD_ID = '2291785437';

    private log = new Logger('IngameReport');

    private paths = new Paths();

    private interval: any;
    private intervalTimeout: number = 1000;
    private readTimeout: number = 1000;
    private lastTickTimestamp: number = 0;
    private tickFilePath: string;

    public constructor(
        public manager: Manager,
    ) {}

    public async start(): Promise<void> {

        const baseDir = this.manager.getServerPath();
        const profiles = this.manager.config?.profilesPath;
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
            if (fs.existsSync(this.tickFilePath)) {
                const stat = fs.statSync(this.tickFilePath);
                const modified = stat.mtime.getTime();

                if (modified !== this.lastTickTimestamp) {
                    this.lastTickTimestamp = modified;
                    await new Promise((r) => setTimeout(r, this.readTimeout));

                    const content = `${fs.readFileSync(this.tickFilePath)}`;
                    const parsed = JSON.parse(content);

                    await this.processIngameReport(parsed);
                }
            }
        } catch (e) {
            this.log.log(LogLevel.ERROR, `Error trying to scan for ingame report file`, e);
        }
    }

    public async processIngameReport(report: IngameReportContainer): Promise<void> {
        const timestamp = new Date().valueOf();

        this.log.log(LogLevel.INFO, `Server sent ingame report: ${report?.players?.length ?? 0} players, ${report?.vehicles?.length ?? 0} vehicles`);

        void this.manager.metrics.pushMetricValue(
            MetricTypeEnum.INGAME_PLAYERS,
            {
                timestamp,
                value: report?.players ?? [],
            },
        );

        void this.manager.metrics.pushMetricValue(
            MetricTypeEnum.INGAME_VEHICLES,
            {
                timestamp,
                value: report?.vehicles ?? [],
            },
        );
    }

    public async installMod(): Promise<void> {
        const serverPath = this.manager.getServerPath();

        const modsPath = path.join(__dirname, '../mods');
        const mods = fs.readdirSync(modsPath);

        for (const mod of mods) {
            const serverModPath = path.join(serverPath, mod);
            if (fs.existsSync(serverModPath)) {
                if (!this.paths.removeLink(serverModPath)) {
                    this.log.log(LogLevel.ERROR, `Could not remove mod ${mod} before copying new files`);
                    return;
                }
            }
        }

        this.paths.copyFromPkg(modsPath, serverPath);

    }

    public getServerMods(): string[] {
        const mods = [this.MOD_NAME];
        if (
            this.manager.getModIdList().includes(this.EXPANSION_VEHICLES_MOD_ID)
        ) {
            mods.push(this.MOD_NAME_EXPANSION);
        }
        return mods;
    }

}
