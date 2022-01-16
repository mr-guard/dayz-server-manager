import 'reflect-metadata';

import { Manager } from './manager';
import { Logger, LogLevel } from '../util/logger';
import { IStatefulService, ServiceConfig } from '../types/service';
import * as chokidar from 'chokidar';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as childProcess from 'child_process';

export const isRunFromWindowsGUI = (): boolean => {
    if (process.platform !== 'win32') {
        return false;
    }

    // eslint-disable-next-line prefer-template
    const stdout = (childProcess.spawnSync(
        'cmd',
        [
            '/c',
            [
                'wmic',
                'process',
                'get',
                'Name,ProcessId',
                '/VALUE',
            ].join(' '),
        ],
    ).stdout + '')
        .replace(/\r/g, '')
        .split('\n\n')
        .filter((x) => !!x)
        .map(
            (x) => x
                .split('\n')
                .filter((y) => !!y)
                .map((y) => {
                    const equalIdx = y.indexOf('=');
                    return [y.slice(0, equalIdx).trim(), y.slice(equalIdx + 1).trim()];
                }),
        )
        .filter((x) => x[1][1] === `${process.ppid}`);

    if (!stdout?.length) {
        return false;
    }

    const parentName = stdout[0]?.[0]?.[1]?.toLowerCase();
    return (
        parentName === 'ApplicationFrameHost.exe'.toLowerCase()
        || parentName === 'explorer.exe'
    );
};

export class ManagerController {

    public static readonly INSTANCE = new ManagerController();

    private log = new Logger('Manager');

    private manager: Manager | undefined;

    private configFileWatcher: chokidar.FSWatcher | undefined;
    private configFileHash: string | undefined;

    private skipInitialCheck: boolean = false;

    public constructor() {
        process.on('unhandledRejection', (reason) => {
            console.error(
                'Unhandled Rejection:',
                reason,
            );

            // TODO save and report
        });

        process.on('exit', () => {
            // prevent imidiate exit if run in GUI
            if (isRunFromWindowsGUI()) {
                childProcess.spawnSync(
                    'pause',
                    {
                        shell: true,
                        stdio: [0, 1, 2],
                    },
                );
            }
        });
    }

    private async forEachManagerServices(
        cb: (
            manager: Manager,
            serviceKey: string,
            meta: ServiceConfig,
        ) => any,
    ): Promise<void> {
        const services = Reflect.getMetadata('services', this.manager);
        for (const service of services) {
            const meta = Reflect.getMetadata('service', this.manager, service);
            if (meta) {
                await cb(this.manager, service, meta);
            }
        }
    }

    public async stop(): Promise<void> {
        if (this.configFileWatcher) {
            await this.configFileWatcher.close();
            this.configFileWatcher = undefined;
        }
        if (this.manager) {
            this.log.log(LogLevel.DEBUG, 'Stopping all running services..');
            await this.forEachManagerServices(async (manager, service, config) => {
                if (config.stateful) {
                    this.log.log(LogLevel.DEBUG, `Stopping ${service}..`);
                    await (manager[service] as IStatefulService)?.stop();
                }
            });
            this.log.log(LogLevel.DEBUG, 'All running services stopped..');
            this.manager = undefined;
        }
    }

    private async startCurrent(): Promise<void> {
        if (this.manager) {
            await this.forEachManagerServices(async (manager, service, config) => {
                if (config.stateful) {
                    this.log.log(LogLevel.DEBUG, `Starting ${service}..`);
                    await (manager[service] as IStatefulService)?.start();
                }
            });
        }
    }

    public async start(): Promise<void> {

        const manager = new Manager();
        const config = manager.configHelper.readConfig();
        if (!config) {
            throw new Error(`Config missing or invalid`);
        }

        this.configFileHash = crypto.createHash('md5')
            .update(JSON.stringify(config))
            .digest('hex');

        await this.stop();
        this.manager = manager;
        manager.applyConfig(config);

        const { loglevel } = config;
        if (typeof loglevel === 'number' && loglevel >= LogLevel.DEBUG && loglevel <= LogLevel.ERROR) {
            Logger.defaultLogLevel = this.manager.config.loglevel;
        }
        process.title = `Server-Manager ${this.manager.getServerExePath()}`;

        this.log.log(LogLevel.DEBUG, 'Setting up services..');

        await this.forEachManagerServices(async (m, service, serviceConfig) => {
            if (serviceConfig.type) {
                this.log.log(LogLevel.DEBUG, `Setting up service: ${service}`);
                m[service] = new serviceConfig.type(m);
            }
        });

        // init
        this.log.log(LogLevel.DEBUG, 'Services are set up');
        try {

            // check firewall, but let the server boot if its not there (could be manually set to ports)
            await this.manager.requirements.checkFirewall();

            // check runtime libs
            const vcRedistOk = await this.manager.requirements.checkVcRedist();
            const directXOk = await this.manager.requirements.checkDirectX();
            if (!vcRedistOk || !directXOk) {
                this.log.log(LogLevel.IMPORTANT, 'Install the missing runtime libs and restart the manager');
                process.exit(0);
            }

            // check error reporting
            await this.manager.requirements.checkWinErrorReporting();

            // eslint-disable-next-line no-negated-condition
            if (!this.skipInitialCheck && !await this.manager.monitor.isServerRunning()) {
                this.log.log(LogLevel.IMPORTANT, 'Initially checking SteamCMD, Server Installation and Mods. Please wait. This may take some minutes...');
                const steamCmdOk = await this.manager.steamCmd.checkSteamCmd();
                if (!steamCmdOk) {
                    throw new Error('SteamCMD init failed');
                }

                // ingame report mod
                await this.manager.ingameReport.installMod();
                // Server
                if (!await this.manager.steamCmd.checkServer() || this.manager.config.updateServerOnStartup) {
                    if (!await this.manager.steamCmd.updateServer()) {
                        throw new Error('Server installation failed');
                    }
                }
                if (!await this.manager.steamCmd.checkServer()) {
                    throw new Error('Server installation failed');
                }


                // Mods
                if (!await this.manager.steamCmd.checkMods() || this.manager.config.updateModsOnStartup) {
                    if (!await this.manager.steamCmd.updateMods()) {
                        throw new Error('Updating Mods failed');
                    }
                }
                if (!await this.manager.steamCmd.installMods()) {
                    throw new Error('Installing Mods failed');
                }
                if (!await this.manager.steamCmd.checkMods()) {
                    throw new Error('Mod installation failed');
                }
            } else {
                this.log.log(LogLevel.IMPORTANT, 'Skipping initial SteamCMD check because the server is already running');
            }

            this.log.log(LogLevel.DEBUG, 'Initial Check done. Starting Init..');
            await this.startCurrent();

            this.manager.initDone = true;
            this.log.log(LogLevel.IMPORTANT, 'Server Manager initialized successfully');
            this.log.log(LogLevel.IMPORTANT, 'Waiting for first server monitor tick..');

            this.watchConfig();

        } catch (e) {
            this.log.log(LogLevel.ERROR, e?.message, e);
            process.exit(1);
        }
    }

    private watchConfig(): void {
        const cfgPath = this.manager.configHelper.getConfigFilePath();
        this.configFileWatcher = chokidar.watch(
            cfgPath,
        ).on(
            'change',
            async () => {

                // usually file "headers" are saved before content is done
                // waiting a small amount of time prevents reading RBW errors
                await new Promise((r) => setTimeout(r, 1000));

                this.log.log(LogLevel.INFO, 'Detected config file change...');

                if (!fs.existsSync(cfgPath)) {
                    this.log.log(LogLevel.ERROR, 'Cannot reload config because config file does not exist');
                    return;
                }

                const config = this.manager.configHelper.readConfig();
                if (!config) {
                    this.log.log(LogLevel.ERROR, 'Cannot reload config because config contains errors');
                    return;
                }

                const newHash = crypto.createHash('md5')
                    .update(JSON.stringify(config))
                    .digest('hex');

                if (newHash === this.configFileHash) {
                    this.log.log(LogLevel.WARN, 'Skipping config reload because no changes were found');
                    return;
                }

                this.log.log(LogLevel.IMPORTANT, 'Reloading config...');
                void this.start();
            },
        );
    }

}
