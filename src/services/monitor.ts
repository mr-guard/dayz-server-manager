import { Manager } from '../control/manager';
import { ProcessEntry, Processes } from '../util/processes';
import { spawn } from 'child_process';
import { Paths } from '../util/paths';
import * as fs from 'fs';
import * as path from 'path';
import { Logger, LogLevel } from '../util/logger';
import { ServerState, SystemReport } from '../types/monitor';
import { MetricWrapper } from '../types/metrics';
import { StatefulService } from '../types/service';

export type ServerStateListener = (state: ServerState) => any;

interface IMonitor {
    manager: Manager;
    isServerRunning(): Promise<boolean>;
    getDayZProcesses(): Promise<ProcessEntry[]>;
    startServer(skipPrep?: boolean): Promise<boolean>;
}

class MonitorLoop implements StatefulService {

    private log = new Logger('Monitor');

    private processes = new Processes();

    private watching: boolean = false;
    private skipping: boolean = false;
    private initialStart: boolean = true;

    private lockPath: string;

    private lastServerUsages: number[] = [];

    public constructor(
        private monitor: IMonitor,
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

        void this.loop();
    }

    public async stop(): Promise<void> {
        if (!this.watching) return;
        this.watching = false;
    }

    private async loop(): Promise<void> {

        while (this.watching) {

            await this.tick();

            await new Promise((r) => setTimeout(r, this.checkIntervall));

        }

    }

    private async tick(): Promise<void> {
        try {
            let needsRestart = true;

            // User locked the server manually
            if (needsRestart && fs.existsSync(this.lockPath)) {
                this.log.log(LogLevel.IMPORTANT, 'Detected manual server lockfile. Skipping server check');
                needsRestart = false;
            }

            // restart locked
            if (needsRestart && this.skipping) {
                this.log.log(LogLevel.IMPORTANT, 'Detected server restart lock state. Skipping server check');
                needsRestart = false;
            }

            // server running
            if (await this.monitor.isServerRunning()) {
                needsRestart = false;
                this.initialStart = false;
                this.log.log(LogLevel.INFO, 'Server running...');
                this.stateListener(ServerState.STARTED);
            } else {
                this.stateListener(ServerState.STOPPED);
            }

            if (needsRestart) {
                this.log.log(LogLevel.IMPORTANT, 'Server not found. Starting...');
                this.stateListener(ServerState.STARTING);
                await this.monitor.startServer(this.initialStart);
                this.lastServerUsages = [];
                this.initialStart = false;
            } else {
                await this.checkPossibleStuckState();
            }
        } catch (e) {
            this.log.log(LogLevel.ERROR, 'Error during server monitor loop', e);
        }
    }

    private async checkPossibleStuckState(): Promise<void> {
        const processes = await this.monitor.getDayZProcesses();

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

            // if the process spends very little cpu time, it probably stuck
            if (this.lastServerUsages.every((x) => (Math.abs(avg - x) < 3))) {
                const msg = 'WARNING: Server possibly got stuck!';
                this.log.log(LogLevel.WARN, msg);
                void this.monitor.manager.discord.relayRconMessage(msg);
            }
        }
    }

}

export class Monitor implements StatefulService, IMonitor {

    private log = new Logger('Monitor');

    private processes = new Processes();

    private paths = new Paths();

    private watcher?: MonitorLoop;
    private lastServerCheckResult?: { ts: number; result: ProcessEntry[] };

    private $internalServerState: ServerState = ServerState.STOPPED;
    private get internalServerState(): ServerState {
        return this.$internalServerState;
    }

    private set internalServerState(state: ServerState) {
        if (this.$internalServerState === state) return;

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
            void this.manager.discord.relayRconMessage(msg);
        }

        this.$internalServerState = state;
        this.stateListeners.forEach((x) => {
            try {
                x(state);
            } catch {}
        });
    }

    private stateListeners: Map<string, ServerStateListener> = new Map();

    public constructor(
        public manager: Manager,
    ) {}

    public get serverState(): ServerState {
        return this.internalServerState;
    }

    public set restartLock(lock: boolean) {
        this.watcher.restartLock = lock;
    }

    public get restartLock(): boolean {
        return this.watcher.restartLock;
    }

    public registerStateListener(id: string, stateListener: ServerStateListener): void {
        this.stateListeners.set(id, stateListener);
    }

    public removeStateListener(id: string): void {
        if (this.stateListeners.has(id)) {
            this.stateListeners.delete(id);
        }
    }

    public async start(): Promise<void> {
        if (this.watcher) return;
        this.watcher = new MonitorLoop(
            this,
            this.manager.getServerPath(),
            this.manager.config.serverProcessPollIntervall,
            (state) => {
                this.internalServerState = state;
            },
        );
        await this.watcher.start();
        this.log.log(LogLevel.IMPORTANT, 'Starting to watch server');
    }

    public async stop(): Promise<void> {
        if (!this.watcher) return;
        await this.watcher.stop();
        this.watcher = undefined;
        this.stateListeners.clear();
        this.log.log(LogLevel.IMPORTANT, 'Stoping to watch server');
    }

    public async isServerRunning(): Promise<boolean> {
        const processes = await this.getDayZProcesses();
        return processes.length > 0;
    }

    public async killServer(force?: boolean): Promise<boolean> {
        if (this.internalServerState === ServerState.STARTING || this.serverState === ServerState.STARTED) {
            this.internalServerState = ServerState.STOPPING;
        }
        const processes = await this.getDayZProcesses();
        const success = await Promise.all(processes?.map((x) => this.processes.killProcess(x.ProcessId, force)) ?? []);

        // TODO check if the server needs to be force killed

        return success.every((x) => x);
    }

    private async prepareServerStart(skipPrep?: boolean): Promise<void> {
        if (!!skipPrep) {
            return;
        }

        // Server
        if (!await this.manager.steamCmd?.checkServer() || this.manager.config.updateServerBeforeServerStart) {
            await this.manager.steamCmd?.updateServer();
        }
        if (!await this.manager.steamCmd?.checkServer()) {
            throw new Error('Server installation failed');
        }

        // Mods
        if (!await this.manager.steamCmd?.checkMods() || this.manager.config.updateModsBeforeServerStart) {
            if (!await this.manager.steamCmd?.updateMods()) {
                throw new Error('Mod update failed');
            }
        }
        if (!await this.manager.steamCmd?.installMods()) {
            throw new Error('Mod installation failed');
        }
        if (!await this.manager.steamCmd?.checkMods()) {
            throw new Error('Mod installation failed');
        }

        // ingame report
        await this.manager.ingameReport.installMod();

        await this.manager.requirements.checkWinErrorReporting();
        await this.manager.requirements.checkFirewall();
    }

    public async startServer(skipPrep?: boolean): Promise<boolean> {
        return new Promise(async (r) => {

            await this.prepareServerStart(skipPrep);

            const hooks = this.manager.getHooks('beforeStart');
            if (hooks.length) {
                for (const hook of hooks) {
                    this.log.log(LogLevel.DEBUG, `Executing beforeStart Hook (${hook.program} ${(hook.params ?? []).join(' ')})`);
                    const hookOut = await this.processes.spawnForOutput(
                        hook.program,
                        hook.params ?? [],
                        {
                            dontThrow: true,
                        },
                    );
                    if (hookOut?.status === 0) {
                        this.log.log(LogLevel.INFO, `beforeStart Hook (${hook.program} ${(hook.params ?? []).join(' ')}) succeed`);
                    } else {
                        this.log.log(LogLevel.ERROR, `beforeStart Hook (${hook.program} ${(hook.params ?? []).join(' ')}) failed`, hookOut);
                    }
                }
            }

            const args = [
                '/c', 'start',
                '/D', this.manager.getServerPath(),
                this.manager.config!.serverExe,
                `-config=${this.manager.config!.serverCfgPath}`,
                `-port=${this.manager.config!.serverPort}`,
                `-profiles=${this.manager.config!.profilesPath}`,
            ];
            const modList = [
                ...(this.manager.steamCmd?.buildWsModParams() ?? []),
                ...(this.manager.config?.localMods ?? []),
            ];
            if (modList?.length) {
                args.push(`-mod=${modList.join(';')}`);
            }

            // Ingame Reporting Addon
            const serverMods = [
                ...(this.manager.ingameReport.getServerMods()),
                ...(this.manager.config?.serverMods ?? []),
            ];

            if (serverMods?.length) {
                args.push(`-servermod=${serverMods.join(';')}`);
            }

            args.push(
                `-serverManagerPort=${this.manager.getWebPort()}`,
                `-serverManagerToken=${this.manager.getIngameToken()}`,
            );

            if (this.manager.config?.adminLog) {
                args.push('-adminlog');
            }
            if (this.manager.config?.doLogs) {
                args.push('-dologs');
            }
            if (this.manager.config?.filePatching) {
                args.push('-filePatching');
            }
            if (this.manager.config?.freezeCheck) {
                args.push('-freezecheck');
            }
            const limitFPS = this.manager.config?.limitFPS ?? 0;
            if (limitFPS > 0 && limitFPS < 200) {
                args.push(`-limitFPS=${limitFPS}`);
            }
            const cpuCount = this.manager.config?.cpuCount ?? 0;
            if (cpuCount && cpuCount > 0) {
                args.push(`-cpuCount=${cpuCount}`);
            }
            if (this.manager.config?.netLog) {
                args.push('-netLog');
            }
            if (this.manager.config?.scrAllowFileWrite) {
                args.push('-scrAllowFileWrite');
            }
            if (this.manager.config?.scriptDebug) {
                args.push('-scriptDebug');
            }
            if (this.manager.config?.serverLaunchParams?.length) {
                args.push(...this.manager.config?.serverLaunchParams);
            }

            const sub = spawn(
                'cmd',
                args,
                {
                    detached: true,
                    stdio: 'ignore',
                },
            );

            sub.on('error', (e) => {
                this.log.log(LogLevel.IMPORTANT, 'Error while trying to start server', e);
                r(false);
            });

            sub.on(
                'exit',
                (code) => {
                    r(code === 0);
                },
            );
        });

    }

    public async getDayZProcesses(): Promise<ProcessEntry[]> {
        let processList: ProcessEntry[] = [];
        if (this.lastServerCheckResult?.ts && (new Date().valueOf() - this.lastServerCheckResult?.ts) < 1000) {
            processList = this.lastServerCheckResult.result;
        } else {
            processList = await this.processes.getProcessList();

            this.log.log(LogLevel.DEBUG, 'Fetched new Process list', processList);

            this.log.log(LogLevel.INFO, 'Fetched new Process list', new Error().stack);

            this.lastServerCheckResult = {
                ts: new Date().valueOf(),
                result: processList,
            };
        }
        return processList
            .filter((x) => this.paths.samePath(x?.ExecutablePath, this.manager.getServerExePath()))
            .map((x) => {
                if (x.CreationDate) {
                    const y = x.CreationDate.substr(0, 4);
                    const m = x.CreationDate.substr(4, 2);
                    const d = x.CreationDate.substr(6, 2);
                    const hour = x.CreationDate.substr(8, 2);
                    const minute = x.CreationDate.substr(10, 2);
                    const second = x.CreationDate.substr(12, 2);
                    x.CreationDate = `${y}-${m}-${d} ${hour}:${minute}:${second}`;
                }
                return x;
            });
    }

    public async getSystemReport(): Promise<SystemReport | null> {
        try {

            let prevReport: MetricWrapper<SystemReport> | null = null;
            if (this.manager.metrics.metrics.SYSTEM?.length) {
                const lastReportValue = this.manager.metrics.metrics.SYSTEM[this.manager.metrics.metrics.SYSTEM.length - 1];
                if (lastReportValue && ((new Date().valueOf() - lastReportValue.timestamp) < (15 * 60 * 1000))) {
                    prevReport = lastReportValue;
                }
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

            report.serverState = this.serverState;

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

            if (this.manager.monitor?.serverState === ServerState.STARTED) {
                const processes = await this.manager.monitor?.getDayZProcesses();
                if (processes?.length) {
                    report.server = {
                        cpuTotal: this.processes.getProcessCPUUsage(processes[0]),
                        cpuSpent: this.processes.getProcessCPUSpent(processes[0]),
                        uptime: this.processes.getProcessUptime(processes[0]),
                        mem: Math.floor(Number(processes[0].PrivatePageCount) / 1024 / 1024),
                    };
                }
            }

            return report;

        } catch (e) {
            this.log.log(LogLevel.ERROR, 'Error building system report', e);
            return null;
        }
    }

}
