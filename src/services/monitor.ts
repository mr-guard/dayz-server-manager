import { Manager } from '../control/manager';
import { ProcessEntry, Processes } from '../services/processes';
import { spawn } from 'child_process';
import * as path from 'path';
import { Logger, LogLevel } from '../util/logger';
import { ServerState, SystemReport } from '../types/monitor';
import { IService, IStatefulService } from '../types/service';
import { ConfigParser } from '../util/config-parser';
import { HookTypeEnum } from '../config/config';
import { detectOS } from '../util/detect-os';
import { delay, inject, injectable, singleton } from 'tsyringe';
import { LoggerFactory } from './loggerfactory';
import { DiscordBot } from './discord';
import { RCON } from './rcon';
import { SteamCMD } from './steamcmd';
import { IngameReport } from './ingame-report';
import { Hooks } from './hooks';
import { FSAPI, InjectionTokens } from '../util/apis';

export type ServerStateListener = (state: ServerState) => any;

@singleton()
@injectable()
export class ServerDetector extends IService {

    private lastServerCheckResult?: { ts: number; result: ProcessEntry[] };

    public constructor(
        loggerFactory: LoggerFactory,
        private manager: Manager,
        private processes: Processes,
    ) {
        super(loggerFactory.createLogger('ServerDetector'));
    }

    public async getDayZProcesses(): Promise<ProcessEntry[]> {
        let processList: ProcessEntry[] = [];
        if (this.lastServerCheckResult?.ts && (new Date().valueOf() - this.lastServerCheckResult?.ts) < 1000) {
            processList = this.lastServerCheckResult.result;
        } else {
            processList = await this.processes.getProcessList(
                this.manager.getServerExePath(),
            );

            this.log.log(
                LogLevel.DEBUG,
                'Fetched new Process list',
                processList,
            );

            this.lastServerCheckResult = {
                ts: new Date().valueOf(),
                result: processList,
            };
        }
        return processList
            .map((x) => {
                if (x.CreationDate) {
                    const y = x.CreationDate.substr(0, 4);
                    const m = x.CreationDate.substr(4, 2);
                    const d = x.CreationDate.substr(6, 2);
                    const hour = x.CreationDate.substr(8, 2);
                    const minute = x.CreationDate.substr(10, 2);
                    const second = x.CreationDate.substr(12, 2);
                    return {
                        ...x,
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        CreationDate: `${y}-${m}-${d} ${hour}:${minute}:${second}`,
                    };
                }
                return x;
            });
    }

    public async isServerRunning(): Promise<boolean> {
        const processes = await this.getDayZProcesses();
        return processes.length > 0;
    }

}

@singleton()
@injectable()
export class ServerStarter extends IService {

    public constructor(
        loggerFactory: LoggerFactory,
        private manager: Manager,
        private processes: Processes,
        private serverDetector: ServerDetector,
        private rcon: RCON,
        private steamCmd: SteamCMD,
        private ingameReport: IngameReport,
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
        const cfgPath = path.join(this.manager.getServerPath(), this.manager.config.serverCfgPath);
        const content = new ConfigParser().json2cfg(this.manager.config.serverCfg);

        this.log.log(LogLevel.INFO, `Writing server cfg`);
        this.fs.writeFileSync(cfgPath, content);
    }

    private async prepareServerStart(skipPrep?: boolean): Promise<void> {

        // ingame report
        await this.ingameReport.installMod();

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
            if (!await this.steamCmd.updateMods()) {
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

    private buildStartServerArgs(): string[] {
        const args = [
            `-config=${this.manager.config.serverCfgPath}`,
            `-port=${this.manager.config.serverPort}`,
            `-profiles=${this.manager.config.profilesPath}`,
        ];
        const modList = [
            ...(this.steamCmd.buildWsModParams() ?? []),
            ...(this.manager.config.localMods ?? []),
        ];
        if (modList?.length) {
            args.push(`-mod=${modList.join(';')}`);
        }

        // Ingame Reporting Addon
        const serverMods = [
            ...(this.ingameReport.getServerMods()),
            ...(this.manager.config.serverMods ?? []),
        ];

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

        return new Promise<boolean>((res, rej) => {
            const spawnCmd = this.buildServerSpawnCmd();
            const args = this.buildStartServerArgs();
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

/* istanbul ignore next */
export class MonitorLoop {

    private loopInterval = 500;

    private lastTick = 0;

    private log = new Logger('Monitor');

    private watching: boolean = false;
    private skipping: boolean = false;
    private initialStart: boolean = true;

    private lockPath: string;

    private lastServerUsages: number[] = [];

    public constructor(
        private serverPath: string,
        private checkIntervall: number,
        private stateListener: ServerStateListener,
    ) {
        this.lockPath = path.join(serverPath, 'RESTART_LOCK');
    }

    public set restartLock(lock: boolean) {
        this.skipping = lock;
    }

    public get restartLock(): boolean {
        return this.skipping;
    }

    public async start(): Promise<void> {
        if (this.watching) return;
        this.watching = true;

        // void this.loop();
    }

    public async stop(): Promise<void> {
        if (!this.watching) return;
        this.watching = false;
    }

}

@singleton()
@injectable()
export class Monitor extends IStatefulService {

    private interval: any;
    public loopInterval = 500;
    private tickRunning = false;
    private lastTick = 0;

    private watching: boolean = false;
    public restartLock: boolean = false;
    private initialStart: boolean = true;

    // cached path to server lock file
    private lockPath: string;

    // saved for determining server stuck state
    private lastServerUsages: number[] = [];

    private $internalServerState: ServerState = ServerState.STOPPED;

    private stateListeners: Map<string, ServerStateListener> = new Map();

    public constructor(
        loggerFactory: LoggerFactory,
        private manager: Manager,
        @inject(delay(() => DiscordBot)) private discord: DiscordBot,
        private processes: Processes,
        private serverStarter: ServerStarter,
        private serverDetector: ServerDetector,
        @inject(InjectionTokens.fs) private fs: FSAPI,
    ) {
        super(loggerFactory.createLogger('Monitor'));
    }

    private get internalServerState(): ServerState {
        return this.$internalServerState;
    }

    private set internalServerState(state: ServerState) {
        if (this.$internalServerState === state) return;

        // prevent intermediate state change
        if (
            state === ServerState.STARTED
            && (
                this.$internalServerState === ServerState.STOPPING
            )
        ) {
            // TODO force resume after this occurs multiple times?
            return;
        }

        // msg about server startup
        if (
            state === ServerState.STARTED
            && (
                this.$internalServerState === ServerState.STARTING
            )
        ) {
            void this.discord.relayRconMessage('Server start sucessful');
        }

        // handle stop after running
        if (
            state === ServerState.STOPPED
            && (
                this.$internalServerState === ServerState.STARTING
                || this.$internalServerState === ServerState.STARTED
            )
        ) {
            const msg = 'Detected possible server crash. Restarting...';
            this.log.log(LogLevel.WARN, msg);
            void this.discord.relayRconMessage(msg);
        }

        this.$internalServerState = state;
        this.stateListeners.forEach((x) => {
            try {
                x(state);
            } catch {}
        });
    }

    public get serverState(): ServerState {
        return this.internalServerState;
    }

    public registerStateListener(id: string, stateListener: ServerStateListener): void {
        this.stateListeners.set(id, stateListener);
    }

    public removeStateListener(id: string): void {
        if (this.stateListeners.has(id)) {
            this.stateListeners.delete(id);
        }
    }

    public async killServer(force?: boolean): Promise<boolean> {
        if (this.internalServerState === ServerState.STARTING || this.serverState === ServerState.STARTED) {
            this.internalServerState = ServerState.STOPPING;
        }

        return this.serverStarter.killServer(force);
    }

    public async start(): Promise<void> {
        if (this.interval) return;
        this.lastTick = 0;
        this.tickRunning = false;
        this.interval = setInterval(
            () => {
                if (this.tickRunning) {
                    return;
                }
                if (
                    (new Date().valueOf() - this.lastTick)
                        > this.manager.config.serverProcessPollIntervall
                ) {
                    this.tickRunning = true;
                    const cb = (): void => {
                        this.tickRunning = false;

                        // set lsat tick time (might be edited by tick itself)
                        this.lastTick = Math.max(
                            this.lastTick,
                            new Date().valueOf(),
                        );
                    };
                    this.tick().then(cb, cb);
                }
            },
            this.loopInterval,
        );
        this.log.log(LogLevel.IMPORTANT, 'Starting to watch server');
    }

    public async stop(): Promise<void> {
        if (!this.interval) return;
        clearInterval(this.interval);
        this.interval = undefined;
        this.stateListeners.clear();
        this.log.log(LogLevel.IMPORTANT, 'Stoping to watch server');
    }

    private async tick(): Promise<void> {
        try {
            let needsRestart = true;

            // User locked the server manually
            if (needsRestart && this.fs.existsSync(this.lockPath)) {
                this.log.log(LogLevel.IMPORTANT, 'Detected manual server lockfile. Skipping server check');
                needsRestart = false;
            }

            // restart locked
            if (needsRestart && this.restartLock) {
                this.log.log(LogLevel.IMPORTANT, 'Detected server restart lock state. Skipping server check');
                needsRestart = false;
            }

            // server running
            if (await this.serverDetector.isServerRunning()) {
                needsRestart = false;
                this.initialStart = false;
                this.log.log(LogLevel.INFO, 'Server running...');
                this.internalServerState = ServerState.STARTED;
            } else {
                this.internalServerState = ServerState.STOPPED;
            }

            if (needsRestart) {
                this.log.log(LogLevel.IMPORTANT, 'Server not found. Starting...');
                this.internalServerState = ServerState.STARTING;
                await this.serverStarter.startServer(this.initialStart);
                this.lastServerUsages = [];
                this.initialStart = false;

                // give the server a minute to start up
                this.skipLoop(60000);
            } else {
                await this.checkPossibleStuckState();
            }
        } catch (e) {
            this.log.log(LogLevel.ERROR, 'Error during server monitor loop', e);
        }
    }

    public async checkPossibleStuckState(): Promise<boolean> {
        const processes = await this.serverDetector.getDayZProcesses();

        // no processes found, also means no process to be stuck
        if (!processes?.length) {
            this.lastServerUsages = [];
            return false;
        }

        if (this.lastServerUsages.length >= 5) {
            this.lastServerUsages.shift();
        }
        this.lastServerUsages.push(
            this.processes.getProcessCPUSpent(processes[0]),
        );

        if (this.lastServerUsages.length >= 5) {
            let avg = 0;
            for (const usage of this.lastServerUsages) {
                avg += usage;
            }
            avg /= this.lastServerUsages.length;
            // if the process spends very little cpu time, it probably got stuck
            if (this.lastServerUsages.every((x) => (Math.abs(avg - x) < 3))) {
                const msg = 'WARNING: Server possibly got stuck!';
                this.log.log(LogLevel.WARN, msg);
                void this.discord.relayRconMessage(msg);
                return true;
            }
        }

        return false;
    }

    public skipLoop(forTime?: number): void {
        this.lastTick = new Date().valueOf() + (forTime ?? 30000);
    }

}

@singleton()
@injectable()
export class SystemReporter extends IService {

    private prevReport: SystemReport | null = null;
    private prevReportTS: number;

    public constructor(
        loggerFactory: LoggerFactory,
        private processes: Processes,
        private monitor: Monitor,
        private serverDetector: ServerDetector,
    ) {
        super(loggerFactory.createLogger('SystemReport'));
    }

    public async getSystemReport(): Promise<SystemReport | null> {
        try {

            let prevReport = null;
            if (this.prevReport && (new Date().valueOf() - this.prevReportTS) < (15 * 60 * 1000)) {
                prevReport = this.prevReport;
            }

            const system = this.processes.getSystemUsage();
            let busy = 0;
            let idle = 0;

            const eachCPU = system.cpu.map((cpu) => {
                const t = cpu.times;
                const cpuBusy = t.user + t.nice + t.sys + t.irq;

                idle += t.idle;
                busy += cpuBusy;

                return Math.round((cpuBusy / (t.idle + cpuBusy)) * 100);
            });

            let interval = busy + idle;
            let used = busy;
            if (prevReport?.value?.system?.cpuSpent && prevReport?.value?.system?.uptime) {
                interval -= prevReport.value.system.uptime;
                used -= prevReport.value.system.cpuSpent;
            }

            const report = new SystemReport();
            report.system = {
                cpuTotal: Math.round((used / interval) * 100),
                cpuSpent: busy,
                uptime: busy + idle,
                cpuEach: eachCPU,
                mem: Math.floor((system.memTotal - system.memFree) / 1024 / 1024),
                memTotal: Math.floor(system.memTotal / 1024 / 1024),
            };

            report.serverState = this.monitor.serverState;

            const processCpu = process.cpuUsage();
            const processUp = process.uptime();

            let processInterval = processUp;
            let processUsed = (processCpu.system + processCpu.user) / 1000000;
            if (prevReport?.value?.manager?.cpuSpent && prevReport?.value?.manager?.uptime) {
                processInterval -= prevReport.value.manager.uptime;
                processUsed -= prevReport.value.manager.cpuSpent;
            }

            report.manager = {
                cpuTotal: Math.round((processUsed / processInterval) * 100),
                cpuSpent: processCpu.system + processCpu.user,
                uptime: processUp,
                mem: Math.floor(process.memoryUsage().heapTotal / 1024 / 1024),
            };

            if (this.monitor.serverState === ServerState.STARTED) {
                const processes = await this.serverDetector.getDayZProcesses();
                if (processes?.length) {
                    report.server = {
                        cpuTotal: this.processes.getProcessCPUUsage(processes[0]),
                        cpuSpent: this.processes.getProcessCPUSpent(processes[0]),
                        uptime: this.processes.getProcessUptime(processes[0]),
                        mem: Math.floor(Number(processes[0].PrivatePageCount) / 1024 / 1024),
                    };
                }
            }

            this.prevReport = report;
            this.prevReportTS = new Date().valueOf();

            return report;

        } catch (e) {
            this.log.log(LogLevel.ERROR, 'Error building system report', e);
            return null;
        }
    }

}
