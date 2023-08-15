import { Manager } from '../control/manager';
import { IService } from '../types/service';
import * as path from 'path';
import { HookTypeEnum } from '../config/config';
import { inject, injectable, singleton } from 'tsyringe';
import { LoggerFactory } from './loggerfactory';
import { Backups } from './backups';
import { Hooks } from './hooks';
import { FSAPI, InjectionTokens } from '../util/apis';
import { LogLevel } from '../util/logger';
import { Paths } from './paths';

@singleton()
@injectable()
export class MissionFiles extends IService {

    public constructor(
        loggerFactory: LoggerFactory,
        private manager: Manager,
        private backup: Backups,
        private hooks: Hooks,
        private paths: Paths,
        @inject(InjectionTokens.fs) private fs: FSAPI,
    ) {
        super(loggerFactory.createLogger('MissionFiles'));
    }

    public async getMissionPath(...subPath: string[]): Promise<string> {
        const missionPath = this.paths.resolve(
            this.manager.getServerPath(),
            'mpmissions',
            (await this.manager.getServerCfg()).Missions.DayZ.template,
        );
        if (!subPath?.length) {
            return missionPath;
        }
        let normalizedSubPath = path.normalize(path.join(...subPath));
        if (normalizedSubPath.startsWith('/') || normalizedSubPath.startsWith('\\')) {
            normalizedSubPath = normalizedSubPath.slice(1);
        }
        if (!normalizedSubPath.length) {
            return missionPath;
        }
        const totalPath = this.paths.resolve(missionPath, normalizedSubPath);
        if (
            !totalPath.startsWith(missionPath)
            || totalPath.includes('..')
            || totalPath.includes('\0')
        ) {
            this.log.log(LogLevel.WARN, `Detected potential path traversal attack! Requested path: "${totalPath}" evaluted from "${subPath.join('/')}"`);
            return undefined;
        }
        return totalPath;
    }

    public async readMissionFile(file: string): Promise<string> {
        const filePath = await this.getMissionPath(file);
        if (!filePath) {
            return null;
        }
        return String(await this.fs.promises.readFile(filePath, { encoding: 'utf-8' }));
    }

    public async readMissionDir(dir: string): Promise<string[]> {
        const filePath = await this.getMissionPath(dir);
        if (!filePath) {
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
        const filePath = await this.getMissionPath(file);
        if (!filePath) {
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
