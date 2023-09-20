import { Manager } from '../control/manager';
import { Processes } from '../services/processes';
import { spawn } from 'child_process';
import * as path from 'path';
import { LogLevel } from '../util/logger';
import { IService } from '../types/service';
import { ConfigParser } from '../util/config-parser';
import { HookTypeEnum } from '../config/config';
import { detectOS } from '../util/detect-os';
import { delay, inject, injectable, singleton } from 'tsyringe';
import { LoggerFactory } from './loggerfactory';
import { RCON } from './rcon';
import { SteamCMD } from './steamcmd';
import { Hooks } from './hooks';
import { FSAPI, InjectionTokens } from '../util/apis';
import { ServerDetector } from './server-detector';
import { EventBus } from '../control/event-bus';
import { InternalEventTypes } from '../types/events';

@singleton()
@injectable()
export class ServerStarter extends IService {

    public constructor(
        loggerFactory: LoggerFactory,
        private manager: Manager,
        private processes: Processes,
        private serverDetector: ServerDetector,
        @inject(delay(() => RCON)) private rcon: RCON,
        private steamCmd: SteamCMD,
        private eventBus: EventBus,
        private hooks: Hooks,
        @inject(InjectionTokens.fs) private fs: FSAPI,
    ) {
        super(loggerFactory.createLogger('ServerStarter'));
    }

    public async killServer(force?: boolean): Promise<boolean> {
        if (force || !this.rcon?.isConnected()) {

            const processes = await this.serverDetector.getDayZProcesses();
            const success = await Promise.all(
                processes?.map((x) => {
                    return (async () => {
                        try {
                            await this.processes.killProcess(x.ProcessId, force);
                            return true;
                        } catch (err) {
                            this.log.log(
                                LogLevel.ERROR,
                                `Failed to kill process ${x.ProcessId}: ${err.status}`,
                                err.stdout,
                                err.stderr,
                            );
                        }
                        return false;
                    })();
                }) ?? [],
            );
            return success.every((x) => x);
        }

        return this.rcon.shutdown().then(
            () => true,
            /* istanbul ignore next */ () => false,
        );

    }

    public async writeServerCfg(): Promise<void> {
        if (this.manager.config.serverCfg) {
            const cfgPath = path.join(this.manager.getServerPath(), this.manager.config.serverCfgPath);
            const content = new ConfigParser().json2cfg(this.manager.config.serverCfg);

            this.log.log(LogLevel.INFO, `Writing server cfg`);
            this.fs.writeFileSync(cfgPath, content);
        } else {
            this.log.log(LogLevel.INFO, `Skipping to write server cfg because it is not configured`);
        }
    }

    private async prepareServerStart(skipPrep?: boolean): Promise<void> {

        // install internal mods
        await Promise.all(
            await this.eventBus.request(InternalEventTypes.INTERNAL_MOD_INSTALL),
        );

        // battleye / rcon
        await this.rcon?.createBattleyeConf();

        await this.writeServerCfg();

        if (!!skipPrep) {
            return;
        }

        // Server
        if (!await this.steamCmd.checkServer() || this.manager.config.updateServerBeforeServerStart) {
            await this.steamCmd.updateServer();
        }
        if (!await this.steamCmd.checkServer()) {
            throw new Error('Server installation failed');
        }

        // Mods
        if (!await this.steamCmd.checkMods() || this.manager.config.updateModsBeforeServerStart) {
            if (!await this.steamCmd.updateAllMods()) {
                throw new Error('Mod update failed');
            }
        }
        if (!await this.steamCmd.installMods()) {
            throw new Error('Mod installation failed');
        }
        if (!await this.steamCmd.checkMods()) {
            throw new Error('Mod installation failed');
        }

    }

    private buildServerSpawnCmd(): { cmd: string; args: string[]; cwd?: string } {
        if (detectOS() === 'windows') {
            return {
                cmd: 'cmd',
                args: [
                    '/c', 'start',
                    '/D', this.manager.getServerPath(),
                    this.manager.config.serverExe,
                ],
            };
        }

        return {
            cmd: this.manager.config.serverExe,
            args: [],
            cwd: this.manager.getServerPath(),
        };
    }

    private async buildStartServerArgs(): Promise<string[]> {
        const args = [
            `-config=${this.manager.config.serverCfgPath}`,
            `-port=${this.manager.config.serverPort}`,
            `-profiles=${this.manager.config.profilesPath}`,
        ];
        const modList = [
            ...(this.steamCmd.buildWsModParams() ?? []),
            ...(this.manager.config.localMods ?? []),
        ].filter((x) => !!x);
        if (modList?.length) {
            args.push(`-mod=${modList.join(';')}`);
        }

        const serverMods = [
            ...(
                await Promise.all(
                    await (this.eventBus.request(
                        InternalEventTypes.GET_INTERNAL_MODS,
                    ) as Promise<Promise<string[]>[]>),
                )
            ).flat(),
            ...(this.manager.config.serverMods ?? []),
            ...(this.steamCmd.buildWsServerModParams() ?? []),
        ].filter((x) => !!x);

        if (serverMods.length) {
            args.push(`-servermod=${serverMods.join(';')}`);
        }

        if (this.manager.config.adminLog) {
            args.push('-adminlog');
        }
        if (this.manager.config.doLogs) {
            args.push('-dologs');
        }
        if (this.manager.config.filePatching) {
            args.push('-filePatching');
        }
        if (this.manager.config.freezeCheck) {
            args.push('-freezecheck');
        }
        const limitFPS = this.manager.config.limitFPS ?? 0;
        if (limitFPS > 0 && limitFPS < 200) {
            args.push(`-limitFPS=${limitFPS}`);
        }
        const cpuCount = this.manager.config.cpuCount ?? 0;
        if (cpuCount && cpuCount > 0) {
            args.push(`-cpuCount=${cpuCount}`);
        }
        if (this.manager.config.netLog) {
            args.push('-netLog');
        }
        if (this.manager.config.scrAllowFileWrite) {
            args.push('-scrAllowFileWrite');
        }
        if (this.manager.config.scriptDebug) {
            args.push('-scriptDebug');
        }
        if (this.manager.config.serverLaunchParams?.length) {
            args.push(...this.manager.config.serverLaunchParams);
        }
        return args;
    }

    public async startServer(skipPrep?: boolean): Promise<boolean> {
        await this.prepareServerStart(skipPrep);

        await this.hooks.executeHooks(HookTypeEnum.beforeStart);

        const spawnCmd = this.buildServerSpawnCmd();
        const args = await this.buildStartServerArgs();
        return new Promise<boolean>((res, rej) => {
            try {
                const sub = spawn(
                    spawnCmd.cmd,
                    [
                        ...spawnCmd.args,
                        ...args,
                    ],
                    {
                        detached: true,
                        stdio: 'ignore',
                        cwd: spawnCmd.cwd,
                    },
                );
                sub.unref();

                sub.on('error', /* istanbul ignore next */ (e) => {
                    this.log.log(LogLevel.IMPORTANT, 'Error while trying to start server', e);
                    res(false);
                });

                sub.on(
                    'exit',
                    (code) => {
                        res(code === 0);
                    },
                );

            } catch (e) {
                rej(e);
            }
        });
    }

}
