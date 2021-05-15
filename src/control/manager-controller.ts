import 'reflect-metadata';

import { Manager } from './manager';
import { Logger, LogLevel } from '../util/logger';
import { IStatefulService, ServiceConfig } from '../types/service';

export class ManagerController {

    public static readonly INSTANCE = new ManagerController();

    private log = new Logger('Manager');

    private manager: Manager | undefined;

    private skipInitialCheck: boolean = false;

    public constructor() {
        process.on('unhandledRejection', (reason) => {
            console.error(
                'Unhandled Rejection:',
                reason,
            );

            // TODO save and report
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

    private async stopCurrent(): Promise<void> {
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

    public async run(): Promise<void> {

        await this.stopCurrent();

        this.manager = new Manager();

        if (!await this.manager.readConfig()) {
            return;
        }

        const loglevel = this.manager.config?.loglevel;
        if (typeof loglevel === 'number' && loglevel >= LogLevel.DEBUG && loglevel <= LogLevel.ERROR) {
            Logger.defaultLogLevel = this.manager.config.loglevel;
        }
        process.title = `Server-Manager ${this.manager.getServerExePath()}`;


        this.log.log(LogLevel.DEBUG, 'Setting up services..');

        await this.forEachManagerServices(async (manager, service, config) => {
            if (config.type) {
                this.log.log(LogLevel.DEBUG, `Setting up service: ${service}`);
                manager[service] = new config.type(manager);
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

        } catch (e) {
            this.log.log(LogLevel.ERROR, e?.message, e);
            process.exit(1);
        }
    }

}
