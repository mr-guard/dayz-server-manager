import 'reflect-metadata';

import { Manager } from './manager';
import { Logger, LogLevel } from '../util/logger';
import { IStatefulService } from '../types/service';
import { Requirements } from '../services/requirements';
import { ConfigWatcher } from '../services/config-watcher';
import { container, injectable, Lifecycle, registry, singleton } from 'tsyringe';
import { LoggerFactory } from '../services/loggerfactory';
import { ServerDetector } from '../services/server-detector';
import { IngameReport } from '../services/ingame-report';
import { SteamCMD } from '../services/steamcmd';
import { InjectionTokens } from '../util/apis';
import * as fsModule from 'fs';
import * as httpsModule from 'https';
import * as childProcessModule from 'child_process';
import * as ptyModule from 'node-pty';
import { Monitor } from '../services/monitor';
import { Events } from '../services/events';
import { Hooks } from '../services/hooks';
import { LogReader } from '../services/log-reader';
import { MissionFiles } from '../services/mission-files';
import { SystemReporter } from '../services/system-reporter';
import { DiscordBot } from '../services/discord';
import { Interface } from '../interface/interface';
import { DiscordMessageHandler } from '../interface/discord-message-handler';
import { REST } from '../interface/rest';
import { MetricsCollector } from '../services/metrics-collector';
import { IngameREST } from '../interface/ingame-rest';
import { SyberiaCompat } from '../services/syberia-compat';
import { DiscordEventConverter } from '../services/discord-event-converter';
import { ConfigFileHelper } from '../config/config-file-helper';

@singleton()
@registry([
    {
    token: InjectionTokens.fs,
    useValue: fsModule,
    },
    {
    token: InjectionTokens.https,
    useValue: httpsModule,
    },
    {
    token: InjectionTokens.childProcess,
    useValue: childProcessModule,
    },
    {
    token: InjectionTokens.pty,
    useValue: ptyModule,
    },

    // standalone services
    {
    token: Monitor,
    useClass: Monitor,
    options: { lifecycle: Lifecycle.Singleton },
    },
    {
    token: Events,
    useClass: Events,
    options: { lifecycle: Lifecycle.Singleton },
    },
    {
    token: LogReader,
    useClass: LogReader,
    options: { lifecycle: Lifecycle.Singleton },
    },
    {
    token: Hooks,
    useClass: Hooks,
    options: { lifecycle: Lifecycle.Singleton },
    },
    {
    token: MissionFiles,
    useClass: MissionFiles,
    options: { lifecycle: Lifecycle.Singleton },
    },
    {
    token: SystemReporter,
    useClass: SystemReporter,
    options: { lifecycle: Lifecycle.Singleton },
    },
    {
    token: MetricsCollector,
    useClass: MetricsCollector,
    options: { lifecycle: Lifecycle.Singleton },
    },

    // interfaces
    {
    token: Interface,
    useClass: Interface,
    options: { lifecycle: Lifecycle.Singleton },
    },
    {
    token: DiscordMessageHandler,
    useClass: DiscordMessageHandler,
    options: { lifecycle: Lifecycle.Singleton },
    },
    {
    token: REST,
    useClass: REST,
    options: { lifecycle: Lifecycle.Singleton },
    },
    {
    token: IngameREST,
    useClass: IngameREST,
    options: { lifecycle: Lifecycle.Singleton },
    },
    {
    token: SyberiaCompat,
    useClass: SyberiaCompat,
    options: { lifecycle: Lifecycle.Singleton },
    },
    {
    token: DiscordEventConverter,
    useClass: DiscordEventConverter,
    options: { lifecycle: Lifecycle.Singleton },
    },
]) // eslint-disable-line @typescript-eslint/indent
@injectable()
export class ManagerController {

    private working = false;
    private started = false;

    private skipInit: boolean = process.argv.includes('--skip-init');

    private log: Logger;

    public constructor(
        loggerFactory: LoggerFactory,
        private configWatcher: ConfigWatcher,
        private manager: Manager,
        private serverDetector: ServerDetector,
        private steamCmd: SteamCMD,
        private ingameReport: IngameReport,
        private requirements: Requirements,
        private discord: DiscordBot,
        private discordEvents: DiscordEventConverter,
        private configFileHelper: ConfigFileHelper,
    ) {
        this.log = loggerFactory.createLogger('Bootstrap');
    }

    private getServiceName(service: IStatefulService): string {
        return service.constructor?.name || Object.getPrototypeOf(service)?.name;
    }

    private getStatefulServices(): IStatefulService[] {
        this.log.log(
            LogLevel.DEBUG,
            'Currently Registered Services',
            ([...((container as any)._registry).entries()].map((x) => x[0]?.name || x[0]).filter((x) => typeof x === 'string')),
        );
        const statefulServices = [];
        for (const [token] of ((container as any)._registry).entries()) {
            const protos = [];
            let proto = Object.getPrototypeOf(token);
            while (proto) {
                if (proto.name) protos.push(proto.name);
                proto = Object.getPrototypeOf(proto);
            }

            if (protos.includes(IStatefulService.name)) {
                statefulServices.push(token);
            }
        }
        return statefulServices.map((x) => container.resolve(x));
    }

    public async stop(force?: boolean): Promise<void> {
        if (!this.started) {
            this.log.log(LogLevel.DEBUG, `Stop called while stopped`);
            return;
        }
        if (this.working && !force) {
            this.log.log(LogLevel.DEBUG, `Stop called while ${this.started ? 'stopping' : 'starting'}`);
            return;
        }
        this.working = true;

        try {
            await this.configWatcher.stopWatching();
        } catch (e) {
            this.log.log(LogLevel.ERROR, `Failed to unwatch config`, e);
        }
        this.log.log(LogLevel.DEBUG, 'Stopping all running services..');
        for (const service of this.getStatefulServices()) {
            this.log.log(LogLevel.DEBUG, `Stopping ${this.getServiceName(service)}..`);
            try {
                await service.stop();
            } catch (e) {
                this.log.log(LogLevel.ERROR, `Failed to stop service: ${this.getServiceName(service)}`, e);
            }
        }
        this.log.log(LogLevel.DEBUG, 'Stopping completed..');
        this.working = false;
        this.started = false;
        this.manager.initDone = false;
    }

    public async start(): Promise<void> {

        this.configFileHelper.createDefaultConfig();

        if (this.working) {
            this.log.log(LogLevel.DEBUG, `Start called while ${this.started ? 'stopping' : 'starting'}`);
            return;
        }
        this.working = true;

        await this.stop(true);

        const config = this.configWatcher.watch(
            /* istanbul ignore next */
            () => this.reloadConfig(),
        );

        this.manager.config = config;

        // apply initial log level
        const { loglevel } = config;
        if (typeof loglevel === 'number' && loglevel >= LogLevel.DEBUG && loglevel <= LogLevel.ERROR) {
            Logger.defaultLogLevel = loglevel;
        }

        // set the process title
        process.title = `Server-Manager ${this.manager.getServerExePath()}`;

        // check any requirements before even starting
        if (!this.skipInit) {
            await this.requirements.check();
        }

        this.log.log(LogLevel.DEBUG, 'Setting up services..');

        // init
        this.log.log(LogLevel.DEBUG, 'Services are set up');
        try {

            if (!this.skipInit) {
                await this.initialSetup();
            }

            this.log.log(LogLevel.DEBUG, 'Initial Check done. Starting Init..');
            for (const service of this.getStatefulServices()) {
                this.log.log(LogLevel.DEBUG, `Starting ${this.getServiceName(service)}..`);
                try {
                    await service.start();
                } catch (e) {
                    this.log.log(LogLevel.ERROR, `Failed to start service "${this.getServiceName(service)}": ${e?.message}`, e);
                    throw new Error(`Failed to start service "${this.getServiceName(service)}": ${e?.message}`);
                }
            }
        } catch (e) {
            this.log.log(LogLevel.ERROR, `Setup failed: ${e?.message}`, e);
            process['origExit'](1);
        }

        this.working = false;
        this.started = true;
        this.manager.initDone = true;
        this.log.log(LogLevel.IMPORTANT, 'Server Manager initialized successfully');
        this.log.log(LogLevel.IMPORTANT, 'Waiting for first server monitor tick..');
    }

    /* istanbul ignore next */
    private reloadConfig(): void {
        if (!this.manager?.initDone) {
            this.manager.reloadWaiting = true;
            return;
        }
        if (this.manager?.reloading) {
            this.manager.reloadWaiting = true;
            return;
        }
        this.manager.reloading = true;
        this.log.log(LogLevel.IMPORTANT, 'Reloading config...');
        this.start().then(
            () => {
                this.manager.reloading = false;
                if (this.manager.reloadWaiting) {
                    void this.reloadConfig();
                }
            },
            (e) => {
                this.log.log(LogLevel.ERROR, 'Reloading failed', e);
            },
        );
    }

    private async initialSetup(): Promise<void> {

        if (await this.serverDetector.isServerRunning()) {
            this.log.log(LogLevel.IMPORTANT, 'Skipping initial SteamCMD check because the server is already running');
            return;
        }

        this.log.log(LogLevel.IMPORTANT, 'Initially checking SteamCMD, Server Installation and Mods. Please wait. This may take some minutes...');
        const steamCmdOk = await this.steamCmd.checkSteamCmd();
        if (!steamCmdOk) {
            throw new Error('SteamCMD init failed');
        }

        // ingame report mod
        await this.ingameReport.installMod();
        // Server
        if (!await this.steamCmd.checkServer() || this.manager.config.updateServerOnStartup) {
            if (!await this.steamCmd.updateServer()) {
                throw new Error('Server installation failed');
            }
        }
        if (!await this.steamCmd.checkServer()) {
            throw new Error('Server installation failed. Server executable not found. Check the steam cmd logs and your settings for wrong paths or wrong executable names');
        }

        // Mods
        if (!await this.steamCmd.checkMods() || this.manager.config.updateModsOnStartup) {
            if (!await this.steamCmd.updateAllMods()) {
                throw new Error('Updating Mods failed');
            }
        }
        if (!await this.steamCmd.installMods()) {
            throw new Error('Installing Mods failed');
        }
        if (!await this.steamCmd.checkMods()) {
            throw new Error('Mod installation failed');
        }
    }

}
