import { spawn, SpawnOptions } from 'child_process';
import * as os from 'os';
import { detectOS } from './detect-os';
import { Logger, LogLevel } from './logger';
import { merge } from './merge';
import { Paths } from './paths';
import * as ps from '@senfo/process-list';

export class ProcessEntry {

    /* eslint-disable @typescript-eslint/naming-convention */
    public Name: string = '';
    public ProcessId: string = '';
    public ExecutablePath: string = '';
    public CommandLine: string = '';
    public PrivatePageCount: string = '';
    public CreationDate: string = '';
    public UserModeTime: string = '';
    public KernelModeTime: string = '';
    /* eslint-enable @typescript-eslint/naming-convention */

}

export class SystemInfo {

    public cpu: os.CpuInfo[] = [];
    public avgLoad: number[] = [];
    public memTotal: number = -1;
    public memFree: number = -1;
    public uptime: number = -1;

}

export interface SpawnOutput {
    status: number;
    stdout: string;
    stderr: string;
}

export interface ProcessSpawnOpts {
    verbose: boolean;
    ignoreCodes: number[];
    spawnOpts: SpawnOptions | any;
    dontThrow: boolean;
    stdOutHandler: (data: string) => any;
    stdErrHandler: (data: string) => any;
}

export interface IProcessSpawner {
    spawnForOutput(
        cmd: string,
        args?: string[],
        opts?: Partial<ProcessSpawnOpts>,
    ): Promise<SpawnOutput>;
}

class ProcessSpawner implements IProcessSpawner {

    private log = new Logger('ProcessSpawn');

    public async spawnForOutput(
        cmd: string,
        args?: string[],
        opts?: Partial<ProcessSpawnOpts>,
    ): Promise<SpawnOutput> {
        return new Promise((r, e) => {
            const startTS = new Date().valueOf();
            try {
                const spawnedProcess = spawn(
                    cmd,
                    args,
                    opts?.spawnOpts,
                );

                let stdout = '';

                if (spawnedProcess.stdout) {
                    spawnedProcess.stdout.on('data', (data) => {
                        if (opts?.verbose) {
                            this.log.log(LogLevel.DEBUG, `SPAWN OUT: ${data}`);
                        }
                        if (opts?.stdOutHandler) {
                            opts?.stdOutHandler(data);
                        }
                        stdout += data;
                    });
                }

                let stderr = '';
                if (spawnedProcess.stderr) {
                    spawnedProcess.stderr.on('data', (data) => {
                        if (opts?.verbose) {
                            this.log.log(LogLevel.ERROR, `SPAWN ERR: ${data}`);
                        }
                        if (opts?.stdErrHandler) {
                            opts?.stdErrHandler(data);
                        }
                        stderr += data;
                    });
                }

                spawnedProcess.on('error', (error) => {
                    this.log.log(LogLevel.ERROR, error?.message ?? 'Spawned processes threw an error', error);
                });

                spawnedProcess.on('close', (code) => {

                    if (!spawnedProcess.stdout || !spawnedProcess.stderr) {
                        console.log('\n');
                    }

                    if (opts?.verbose) {
                        this.log.log(LogLevel.DEBUG, `Spawned process exited with code ${code}`);
                        this.log.log(LogLevel.DEBUG, `Duration: ${new Date().valueOf() - startTS}`);
                    }

                    if (!code || opts?.ignoreCodes?.includes(code) || opts?.dontThrow) {
                        r({ status: code ?? 0, stdout, stderr });
                    } else {
                        // eslint-disable-next-line prefer-promise-reject-errors
                        e({
                            status: code,
                            stdout,
                            stderr,
                        });
                    }
                });
            } catch (error) {
                if (opts?.dontThrow) {
                    r({ status: 1, stdout: '', stderr: error?.message ?? '' });
                } else {
                    // eslint-disable-next-line prefer-promise-reject-errors
                    e({ status: 1, stdout: '', stderr: error?.message ?? '' });
                }
            }
        });
    }

}

export interface IProcessFetcher {
    getProcessList(exeName?: string): Promise<ProcessEntry[]>;
}

class WindowsProcessFetcher implements IProcessFetcher {

    private static readonly WMIC_VALUES = Object.keys(new ProcessEntry());

    private log = new Logger('WinProcesses');

    private spawner = new ProcessSpawner();

    private paths = new Paths();

    public async getProcessList(exeName?: string): Promise<ProcessEntry[]> {
        const result = await this.spawner.spawnForOutput(
            'cmd',
            [
                '/c',
                [
                    'wmic',
                    'process',
                    'get',
                    // ...(exeName ? ['where', `${exeName}`] : []),
                    `${WindowsProcessFetcher.WMIC_VALUES.join(',')}`,
                    '/VALUE',
                ].join(' '),
            ],
            {
                dontThrow: true,
            },
        );
        const procs: ProcessEntry[] = [];
        if (result.stdout) {
            procs.push(
                ...result.stdout
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
                    .map((x: string[][]) => {
                        let proc = new ProcessEntry();
                        x.forEach((y) => proc = merge(proc, { [y[0]]: y[1] }));
                        return proc;
                    })
                    .filter((x) => this.paths.samePath(x?.ExecutablePath, exeName)),
            );
        }
        return procs;
    }

}


export class Processes implements IProcessSpawner, IProcessFetcher {

    private log = new Logger('Processes');

    private spawner = new ProcessSpawner();

    private windowsProcessFetcher = new WindowsProcessFetcher();

    public async getProcessList(exeName?: string): Promise<ProcessEntry[]> {

        if (detectOS() === 'windows') {
            return this.windowsProcessFetcher.getProcessList(exeName);
        }

        const snapshot = await ps.snapshot();
        return snapshot.map((x) => ({
            /* eslint-disable @typescript-eslint/naming-convention */
            Name: x.name,
            ProcessId: String(x.pid),
            ExecutablePath: x.path,
            CommandLine: x.cmdline,
            PrivatePageCount: x.vmem, // TODO
            CreationDate: String(x.starttime.valueOf()), // TODO
            UserModeTime: x.utime, // TODO
            KernelModeTime: x.stime, // TODO
            /* eslint-enable @typescript-eslint/naming-convention */
        }));
    }

    public getProcessCPUSpent(proc: ProcessEntry): number {
        return (Number(proc.UserModeTime) / 10000)
        + (Number(proc.KernelModeTime) / 10000);
    }

    public getProcessUptime(proc: ProcessEntry): number {
        const start = new Date(proc.CreationDate).valueOf();
        const now = new Date().valueOf();
        return (now - start);
    }

    public getProcessCPUUsage(proc: ProcessEntry, prev?: ProcessEntry): number {
        let curSpent = this.getProcessCPUSpent(proc);
        let curUp = this.getProcessUptime(proc);

        if (prev) {
            curSpent -= this.getProcessCPUSpent(proc);
            curUp -= this.getProcessUptime(proc);
        }

        return Math.round(
            (
                (curSpent / Math.max(curUp, 1)) * 100
            ) / Math.max(os.cpus().length, 1),
        );
    }

    public killProcess(pid: string, force?: boolean): Promise<SpawnOutput> {
        if (detectOS() === 'windows') {
            return this.spawnForOutput(
                'taskkill',
                [
                    ...(force ? ['/F'] : []),
                    '/PID',
                    pid,
                ],
            );
        }

        return this.spawnForOutput(
            'kill',
            [
                force
                    ? '-9' // SIGKILL
                    : '-15', // SIGTERM
                pid,
            ],
        );
    }

    public getSystemUsage(): SystemInfo {
        return merge(new SystemInfo(), {
            cpu: os.cpus(),
            avgLoad: os.loadavg(),
            memTotal: os.totalmem(),
            memFree: os.freemem(),
            uptime: os.uptime(),
        });
    }

    public async spawnForOutput(
        cmd: string,
        args?: string[],
        opts?: Partial<ProcessSpawnOpts>,
    ): Promise<SpawnOutput> {
        return this.spawner.spawnForOutput(cmd, args, opts);
    }

}
