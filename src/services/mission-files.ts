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
        return this.getCheckedPath(missionPath, ...(subPath || []));
    }

    public async getProfilePath(...subPath: string[]): Promise<string> {
        const profilePath = this.paths.resolve(
            this.manager.getProfilesPath(),
        );
        return this.getCheckedPath(profilePath, ...(subPath || []));
    }

    private async getCheckedPath(basePath: string, ...subPath: string[]): Promise<string> {
        if (!subPath?.length) {
            return basePath;
        }
        let normalizedSubPath = path.normalize(path.join(...subPath));
        if (normalizedSubPath.startsWith('/') || normalizedSubPath.startsWith('\\')) {
            normalizedSubPath = normalizedSubPath.slice(1);
        }
        if (!normalizedSubPath.length) {
            return basePath;
        }
        const totalPath = this.paths.resolve(basePath, normalizedSubPath);
        if (
            !totalPath.startsWith(basePath)
            || totalPath.includes('..')
            || totalPath.includes('\0')
        ) {
            this.log.log(LogLevel.WARN, `Detected potential path traversal attack! Requested path: "${totalPath}" evaluted from "${subPath.join('/')}"`);
            return undefined;
        }
        return totalPath;
    }

    private async readFile(filePath: string): Promise<string> {
        if (!filePath) {
            return null;
        }
        return String(await this.fs.promises.readFile(filePath, { encoding: 'utf-8' }));
    }

    public async readMissionFile(file: string): Promise<string> {
        const filePath = await this.getMissionPath(file);
        return this.readFile(filePath);
    }

    public async readProfileFile(file: string): Promise<string> {
        const filePath = await this.getProfilePath(file);
        return this.readFile(filePath);
    }

    private async readDir(dirPath: string): Promise<string[]> {
        if (!dirPath) {
            return [];
        }
        return (await (this.fs.promises.readdir(dirPath, { withFileTypes: true })))
            .map((x) => {
                if (x.isDirectory() && !x.name.endsWith('/')) {
                    return `${x.name}/`;
                }
                return x.name;
            });
    }

    public async readMissionDir(dir: string): Promise<string[]> {
        const dirPath = await this.getMissionPath(dir);
        return this.readDir(dirPath);
    }

    public async readProfileDir(dir: string): Promise<string[]> {
        const dirPath = await this.getProfilePath(dir);
        return this.readDir(dirPath);
    }

    private async writeFile(
        filePath: string,
        content: string,
        createBackup?: boolean,
    ): Promise<void> {
        if (!filePath || !content) {
            return;
        }
        if (createBackup) {
            await this.backup.createBackup();
        }
        await this.fs.promises.mkdir(path.dirname(filePath), { recursive: true });
        await this.fs.promises.writeFile(filePath, content);

        await this.hooks.executeHooks(HookTypeEnum.missionChanged);
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
        return this.writeFile(filePath, content, createBackup);
    }

    public async writeProfileFile(
        file: string,
        content: string,
        createBackup?: boolean,
    ): Promise<void> {
        if (!file || !content) {
            return;
        }
        const filePath = await this.getProfilePath(file);
        return this.writeFile(filePath, content, createBackup);
    }

}
