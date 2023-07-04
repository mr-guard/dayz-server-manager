import 'reflect-metadata';

import { Manager } from './manager';
import { Logger, LogLevel } from '../util/logger';
import { IStatefulService } from '../types/service';
import { Requirements } from '../services/requirements';
import { ConfigWatcher } from '../services/config-watcher';
import { container, injectable, registry, singleton } from 'tsyringe';
import { LoggerFactory } from '../services/loggerfactory';
import { ServerDetector } from '../services/monitor';
import { IngameReport } from '../services/ingame-report';
import { SteamCMD } from '../services/steamcmd';
import { InjectionTokens } from '../util/apis';
import * as fsModule from 'fs';
import * as httpsModule from 'https';
import * as childProcessModule from 'child_process';

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
])
@injectable()
export class ManagerController {

    private working = false;
    private started = false;
    private skipInitialCheck: boolean = false;

    private log: Logger;

    public constructor(
        loggerFactory: LoggerFactory,
        private configWatcher: ConfigWatcher,
        private manager: Manager,
        private serverDetector: ServerDetector,
        private steamCmd: SteamCMD,
        private ingameReport: IngameReport,
        private requirements: Requirements,
    ) {
        this.log = loggerFactory.createLogger('Bootstrap');
    }

    private getServiceName(service: IStatefulService): string {
        return service.constructor?.name || Object.getPrototypeOf(service)?.name;
    }

    private getStatefulServices(): IStatefulService[] {
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
        await this.requirements.check();

        this.log.log(LogLevel.DEBUG, 'Setting up services..');

        // TODO is something like this needed??? SERVICES.foreach(x => container.resolve(x))

        // init
        this.log.log(LogLevel.DEBUG, 'Services are set up');
        try {

            await this.initialSetup();

            this.log.log(LogLevel.DEBUG, 'Initial Check done. Starting Init..');
            for (const service of this.getStatefulServices()) {
                this.log.log(LogLevel.DEBUG, `Starting ${this.getServiceName(service)}..`);
                await service.start();
            }
        } catch (e) {
            this.log.log(LogLevel.ERROR, e?.message, e);
            process.exit(1);
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
            return;
        }
        this.log.log(LogLevel.IMPORTANT, 'Reloading config...');
        void this.start();
    }

    private async initialSetup(): Promise<void> {

        if (this.skipInitialCheck || await this.serverDetector.isServerRunning()) {
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
            throw new Error('Server installation failed');
        }

        // Mods
        if (!await this.steamCmd.checkMods() || this.manager.config.updateModsOnStartup) {
            if (!await this.steamCmd.updateMods()) {
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
