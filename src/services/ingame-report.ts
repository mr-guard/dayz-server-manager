import { Manager } from '../control/manager';
import { IngameReportContainer } from '../types/ingame-report';
import { MetricTypeEnum } from '../types/metrics';
import * as path from 'path';
import * as fs from 'fs';
import { Paths } from '../util/paths';
import { Logger, LogLevel } from '../util/logger';
import { IService } from '../types/service';

export class IngameReport implements IService {

    public readonly MOD_NAME = '@DayZServerManager';
    public readonly MOD_NAME_EXPANSION = '@DayZServerManagerExpansion';

    public readonly EXPANSION_VEHICLES_MOD_ID = '2291785437';

    private log = new Logger('IngameReport');

    private paths = new Paths();

    public constructor(
        public manager: Manager,
    ) {}

    public async processIngameReport(report: IngameReportContainer): Promise<void> {
        const timestamp = new Date().valueOf();

        this.log.log(LogLevel.INFO, `Server sent ingame report: ${report.players.length} players, ${report.vehicles.length} vehicles`);

        void this.manager.metrics.pushMetricValue(
            MetricTypeEnum.INGAME_PLAYERS,
            {
                timestamp,
                value: report.players,
            },
        );

        void this.manager.metrics.pushMetricValue(
            MetricTypeEnum.INGAME_VEHICLES,
            {
                timestamp,
                value: report.vehicles,
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
            this.manager.config.steamWsMods.includes(this.EXPANSION_VEHICLES_MOD_ID)
        ) {
            mods.push(this.MOD_NAME_EXPANSION);
        }
        return mods;
    }

}
