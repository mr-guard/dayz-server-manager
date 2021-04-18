import { DiscordBot } from '../services/discord';
import { REST } from '../interface/rest';
import { RCON } from '../services/rcon';
import { Config, Hook, HookType, UserLevel } from '../config/config';
import * as fs from 'fs';
import { SteamCMD } from '../services/steamcmd';
import { Paths } from '../util/paths';
import * as path from 'path';
import { Monitor } from '../services/monitor';
import { Metrics } from '../services/metrics';
import { Interface } from '../interface/interface';
import { Logger, LogLevel } from '../util/logger';
import { Events } from '../services/events';
import { generateConfigTemplate } from '../config/config-template';
import { validateConfig } from '../config/config-validate';
import { LogReader } from '../services/log-reader';
import { Backups } from '../services/backups';
import { merge } from '../util/merge';
import { Requirements } from '../services/requirements';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const configschema = require('../config/config.schema.json');

export class Manager {

    private static log = new Logger('Manager');

    public interface!: Interface;

    public rest!: REST;

    public discord!: DiscordBot;

    public rcon!: RCON;

    public steamCmd!: SteamCMD;

    public monitor!: Monitor;

    public metrics!: Metrics;

    public events!: Events;

    public logReader!: LogReader;

    public backup!: Backups;

    public requirements!: Requirements;

    public config!: Config;

    public initDone: boolean = false;

    public readConfig(): boolean {
        const cfgPath = path.join(Paths.cwd(), 'server-manager.json');
        Manager.log.log(LogLevel.IMPORTANT, `Trying to read config at: ${cfgPath}`);
        if (!fs.existsSync(cfgPath)) {
            Manager.log.log(LogLevel.ERROR, 'Cannot read config. File does not exist');
            return false;
        }
        const fileContent = fs.readFileSync(cfgPath)?.toString();
        if ((fileContent?.length ?? 0) > 0) {
            const stripped = fileContent
                .replace(/(\/\*\*(.|\n)*?\*\/)|(\/\/(.*))/g, '');

            try {
                const parsed = JSON.parse(stripped);

                const configErrors = validateConfig(parsed);
                if (configErrors?.length) {
                    Manager.log.log(LogLevel.ERROR, 'Config has errors:');

                    for (const configError of configErrors) {
                        Manager.log.log(LogLevel.ERROR, configError);
                    }

                    return false;
                }

                Manager.log.log(LogLevel.IMPORTANT, 'Successfully read config');
                this.config = merge(
                    new Config(),
                    parsed,
                );
                return true;
            } catch (e) {
                Manager.log.log(LogLevel.ERROR, 'Error reading config', e);
                return false;
            }
        } else {
            Manager.log.log(LogLevel.ERROR, 'Error config was empty');
            return false;
        }
    }

    public writeConfig(config: Config): string[] {
        if (configschema) {
            // apply defaults
            config = merge(
                new Config(),
                config,
            );
            console.log(config);

            const configErrors = validateConfig(config);
            if (configErrors?.length) {
                return ['New config containes errors. Cannot replace config.', ...configErrors];
            }

            try {
                const outPath = path.join(Paths.cwd(), 'server-manager.json');
                fs.writeFileSync(outPath, generateConfigTemplate(configschema, config));

                return [];
            } catch (e) {
                return [`Error generating / writing config (${e?.message ?? 'Unknown'}). Cannot replace config.`];
            }
        } else {
            return ['Error config schema is not available. Cannot replace config.'];
        }
    }

    public getServerPath(): string {
        const serverFolder = this.config?.serverPath ?? '';
        if (!serverFolder) {
            return path.join(Paths.cwd(), 'DayZServer');
        }

        if (!path.isAbsolute(serverFolder)) {
            return path.join(Paths.cwd(), serverFolder);
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
        return levels.indexOf(userLevel) <= levels.indexOf(level);
    }

    public getHooks(type: HookType): Hook[] {
        return (this.config.hooks ?? []).filter((x) => x.type === type);
    }

}
