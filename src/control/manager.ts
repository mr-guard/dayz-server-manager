import { Config, ServerCfg, UserLevel } from '../config/config';
import { Paths } from '../services/paths';
import * as path from 'path';
import { Logger, LogLevel } from '../util/logger';
import { ServerInfo } from '../types/server-info';
import { LoggerFactory } from '../services/loggerfactory';
import { inject, injectable, singleton } from 'tsyringe';
import { FSAPI, InjectionTokens } from '../util/apis';
import { ConfigParser } from '../util/config-parser';

@singleton()
@injectable()
export class Manager {

    public readonly APP_VERSION: string = 'UNKNOWN';

    private log: Logger;

    private config$!: Config;
    public initDone: boolean = false;

    public constructor(
        loggerFactory: LoggerFactory,
        private paths: Paths,
        @inject(InjectionTokens.fs) private fs: FSAPI,
    ) {
        this.log = loggerFactory.createLogger('Manager');
        this.initDone = false;

        const versionFilePath = path.join(__dirname, '../VERSION');
        if (this.fs.existsSync(versionFilePath)) {
            this.APP_VERSION = this.fs.readFileSync(versionFilePath).toString();
        }
        this.log.log(LogLevel.IMPORTANT, `Starting DZSM Version: ${this.APP_VERSION}`);
    }

    public set config(config: Config) {
        this.config$ = config;
    }

    public get config(): Config {
        return this.config$;
    }

    public getServerPath(): string {
        const serverFolder = this.config?.serverPath ?? '';
        if (!serverFolder) {
            return path.join(this.paths.cwd(), 'DayZServer');
        }

        if (!this.paths.isAbsolute(serverFolder)) {
            return path.join(this.paths.cwd(), serverFolder);
        }
        return serverFolder;
    }

    public getServerExePath(): string {
        return path.join(this.getServerPath(), (this.config?.serverExe ?? 'DayZServer_x64.exe'));
    }

    public getUserLevel(userId: string): UserLevel {
        return this.config?.admins?.find((x) => x.userId === userId)?.userLevel ?? null;
    }

    public isUserOfLevel(userId: string, level: UserLevel): boolean {
        if (!level) {
            return true;
        }
        const userLevel = this.getUserLevel(userId);
        if (!userLevel) {
            return false;
        }
        const levels: UserLevel[] = ['admin', 'manage', 'moderate', 'view'];
        return levels.includes(userLevel) && levels.indexOf(userLevel) <= levels.indexOf(level);
    }

    public getWebPort(): number {
        if ((this.config.webPort ?? 0) > 0) {
            return this.config.webPort;
        }
        return this.config.serverPort + 11;
    }

    public async getServerCfg(): Promise<ServerCfg> {
        if (this.config.serverCfg) {
            return this.config.serverCfg;
        }
        const cfgPath = path.join(this.getServerPath(), this.config.serverCfgPath);
        const rawCfg = this.fs.readFileSync(cfgPath) + '';
        return new ConfigParser().cfg2json(rawCfg);
    }

    public async getServerInfo(): Promise<ServerInfo> {
        const serverCfg = await this.getServerCfg();
        return {
            name: serverCfg.hostname,
            port: this.config.serverPort,
            worldName: serverCfg.Missions.DayZ.template.split('.')[1],
            password: !!serverCfg.password,
            battleye: !!serverCfg.BattlEye,
            maxPlayers: serverCfg.maxPlayers,
            mapHost: this.config.mapHost,
        };
    }

    public getModIdList(): string[] {
        return (this.config?.steamWsMods ?? [])
            .filter((x) => {
                if (typeof x === 'string') {
                    return !!x;
                }

                return !!x.workshopId;
            })
            .map((x) => {
                if (typeof x === 'string') {
                    return x;
                }

                return x.workshopId;
            });
    }

}
