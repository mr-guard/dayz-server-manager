import { Manager } from '../control/manager';
import { IService } from '../types/service';
import * as path from 'path';
import { HookTypeEnum } from '../config/config';
import { inject, injectable, singleton } from 'tsyringe';
import { LoggerFactory } from './loggerfactory';
import { Backups } from './backups';
import { Hooks } from './hooks';
import { FSAPI, InjectionTokens } from '../util/apis';

@singleton()
@injectable()
export class MissionFiles extends IService {

    public constructor(
        loggerFactory: LoggerFactory,
        private manager: Manager,
        private backup: Backups,
        private hooks: Hooks,
        @inject(InjectionTokens.fs) private fs: FSAPI,
    ) {
        super(loggerFactory.createLogger('MissionFiles'));
    }

    private checkMissionPath(checkPath: string): boolean {
        const missionPath = this.getMissionPath();
        return checkPath.startsWith(missionPath) && !checkPath.includes('..');
    }

    public getMissionPath(...subPath: string[]): string {
        return path.join(
            this.manager.getServerPath(),
            'mpmissions',
            this.manager.config.serverCfg.Missions.DayZ.template,
            ...subPath,
        );
    }

    public async readMissionFile(file: string): Promise<string> {
        const filePath = this.getMissionPath(file);
        if (!this.checkMissionPath(filePath)) {
            return null;
        }
        return String(await this.fs.promises.readFile(filePath, { encoding: 'utf-8' }));
    }

    public async readMissionDir(dir: string): Promise<string[]> {
        const filePath = this.getMissionPath(dir);
        if (!this.checkMissionPath(filePath)) {
            return [];
        }
        return (await (this.fs.promises.readdir(filePath, { withFileTypes: true })))
            .map((x) => {
                if (x.isDirectory() && !x.name.endsWith('/')) {
                    return `${x.name}/`;
                }
                return x.name;
            });
    }

    public async writeMissionFile(
        file: string,
        content: string,
        createBackup?: boolean,
    ): Promise<void> {
        if (!file || !content) {
            return;
        }
        const filePath = this.getMissionPath(file);
        if (!this.checkMissionPath(filePath)) {
            return null;
        }
        if (createBackup) {
            await this.backup.createBackup();
        }
        await this.fs.promises.mkdir(path.dirname(filePath), { recursive: true });
        await this.fs.promises.writeFile(filePath, content);

        await this.hooks.executeHooks(HookTypeEnum.missionChanged);
    }

}
