import { DiscordBot } from '../services/discord';
import { Manager } from './manager';
import { Metrics } from '../services/metrics';
import { Monitor } from '../services/monitor';
import { RCON } from '../services/rcon';
import { REST } from '../interface/rest';
import { SteamCMD } from '../services/steamcmd';
import { Interface } from '../interface/interface';
import { Logger, LogLevel } from '../util/logger';
import { StatefulService } from '../types/service';
import { Events } from '../services/events';
import { LogReader } from '../services/log-reader';
import { Backups } from '../services/backups';
import { Requirements } from '../services/requirements';

export class ManagerController {

    public static readonly INSTANCE = new ManagerController();

    private static log = new Logger('Manager');

    private manager: Manager | undefined;

    private skipInitialCheck: boolean = false;

    private readonly STATEFUL_SERVICES: (keyof Manager)[] = [
        'rcon', // must be started first to create rcon conf
        'monitor',
        'discord',
        'rest',
        'metrics',
        'events',
        'logReader',
    ];

    public constructor() {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        process.on('unhandledRejection', (reason, promise) => {
            console.error(
                'Unhandled Rejection:',
                reason,
            );

            // TODO save and report
        });
    }

    private async stopCurrent(): Promise<void> {
        if (this.manager) {
            ManagerController.log.log(LogLevel.DEBUG, 'Stopping all running services..');
            for (const service of this.STATEFUL_SERVICES) {
                ManagerController.log.log(LogLevel.DEBUG, `Stopping ${service}..`);
                await (this.manager[service] as StatefulService)?.stop();
            }
            ManagerController.log.log(LogLevel.DEBUG, 'All running services stopped..');
            this.manager = undefined;
        }
    }

    private async startCurrent(): Promise<void> {
        if (this.manager) {
            for (const service of this.STATEFUL_SERVICES) {
                ManagerController.log.log(LogLevel.DEBUG, `Starting ${service}..`);
                await (this.manager[service] as StatefulService)?.start();
            }
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


        ManagerController.log.log(LogLevel.DEBUG, 'Setting up services..');
        this.manager.interface = new Interface(this.manager);

        // rest api
        this.manager.rest = new REST(this.manager);

        // discord
        this.manager.discord = new DiscordBot(this.manager);

        // rcon
        this.manager.rcon = new RCON(this.manager);

        // steamcmd
        this.manager.steamCmd = new SteamCMD(this.manager);

        // monitor
        this.manager.monitor = new Monitor(this.manager);

        // metrics
        this.manager.metrics = new Metrics(this.manager);

        // (rcon) sheduled events
        this.manager.events = new Events(this.manager);

        // logs
        this.manager.logReader = new LogReader(this.manager);

        // backups
        this.manager.backup = new Backups(this.manager);

        // requirement checks
        this.manager.requirements = new Requirements(this.manager);

        // init
        ManagerController.log.log(LogLevel.DEBUG, 'Services are set up');
        try {

            // check firewall, but let the server boot if its not there (could be manually set to ports)
            await this.manager.requirements.checkFirewall();

            // check runtime libs
            const vcRedistOk = await this.manager.requirements.checkVcRedist();
            const directXOk = await this.manager.requirements.checkDirectX();
            if (!vcRedistOk || !directXOk) {
                ManagerController.log.log(LogLevel.IMPORTANT, 'Install the missing runtime libs and restart the manager');
                process.exit(0);
            }

            // check error reporting
            await this.manager.requirements.checkWinErrorReporting();

            // eslint-disable-next-line no-negated-condition
            if (!this.skipInitialCheck && !await this.manager.monitor.isServerRunning()) {
                ManagerController.log.log(LogLevel.IMPORTANT, 'Initially checking SteamCMD, Server Installation and Mods. Please wait. This may take some minutes...');
                const steamCmdOk = await this.manager.steamCmd.checkSteamCmd();
                if (!steamCmdOk) {
                    throw new Error('SteamCMD init failed');
                }

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
                ManagerController.log.log(LogLevel.IMPORTANT, 'Skipping initial SteamCMD check because the server is already running');
            }

            ManagerController.log.log(LogLevel.DEBUG, 'Initial Check done. Starting Init..');
            await this.startCurrent();

            this.manager.initDone = true;
            ManagerController.log.log(LogLevel.IMPORTANT, 'Server Manager initialized successfully');
            ManagerController.log.log(LogLevel.IMPORTANT, 'Waiting for first server monitor tick..');

        } catch (e) {
            ManagerController.log.log(LogLevel.ERROR, e?.message, e);
            process.exit(1);
        }
    }

}
