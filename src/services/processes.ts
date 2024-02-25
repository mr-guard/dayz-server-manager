import { SpawnOptions } from 'child_process';
import * as os from 'os';
import { detectOS } from '../util/detect-os';
import { LogLevel } from '../util/logger';
import { merge } from '../util/merge';
import { Paths } from './paths';
import { inject, injectable, singleton } from 'tsyringe';
import { CHILDPROCESSAPI, FSAPI, InjectionTokens, PTYAPI } from '../util/apis';
import { IService } from '../types/service';
import { LoggerFactory } from './loggerfactory';

// See: https://stackoverflow.com/questions/25245716/remove-all-ansi-colors-styles-from-strings
const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

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
    spawnOpts: SpawnOptions;
    dontThrow: boolean;
    stdOutHandler: (data: string) => any;
    stdErrHandler: (data: string) => any;
    pty: boolean;
}

export interface IProcessSpawner {
    spawnForOutput(
        cmd: string,
        args?: string[],
        opts?: Partial<ProcessSpawnOpts>,
    ): Promise<SpawnOutput>;
}

@singleton()
@injectable()
export class ProcessSpawner extends IService implements IProcessSpawner {

    private logCommands = false;

    public constructor(
        loggerFactory: LoggerFactory,
        @inject(InjectionTokens.childProcess) private childProcess: CHILDPROCESSAPI,
        @inject(InjectionTokens.pty) private nodePty: PTYAPI,
    ) {
        super(loggerFactory.createLogger('ProcessSpawn'));
    }

    public async spawnForOutput(
        cmd: string,
        args?: string[],
        opts?: Partial<ProcessSpawnOpts>,
    ): Promise<SpawnOutput> {
        if (this.logCommands) {
            this.log.log(
                LogLevel.DEBUG,
                `Executing`,
                [cmd, ...args].join(' '),
                opts?.spawnOpts?.cwd || process.cwd(),
            );
        }

        if (opts?.pty) {
            return this.spawnForOutputPty(cmd, args, opts);
        }

        return new Promise((r, e) => {
            const startTS = new Date().valueOf();
            try {
                const spawnedProcess = this.childProcess.spawn(
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

                spawnedProcess.on(
                    'error',
                    /* istanbul ignore next */
                    (error) => {
                        this.log.log(
                            LogLevel.ERROR,
                            error?.message ?? 'Spawned processes threw an error',
                            error,
                        );
                    },
                );

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

    private async spawnForOutputPty(
        cmd: string,
        args?: string[],
        opts?: Partial<ProcessSpawnOpts>,
    ): Promise<SpawnOutput> {
        return new Promise((r, e) => {
            const startTS = new Date().valueOf();
            try {
                const pty = this.nodePty.spawn(
                    cmd,
                    args,
                    {
                        cwd: opts?.spawnOpts?.cwd as string,
                        useConpty: false,
                    },
                );

                let inputHandlerSet = false;
                if (opts?.spawnOpts?.stdio === 'inherit' || opts?.spawnOpts?.stdio?.[0] === 'inherit') {
                    inputHandlerSet = true;
                    process.stdin.on('data', /* istanbul ignore next */ (data) => {
                        pty.write(data.toString());
                    });
                    process.stdin?.unref?.();
                }

                let stdout = '';
                const stderr = '';
                const onData = pty.onData(async (data) => {

                    // remove any special chars which break formatting
                    data = data
                        .replace(ansiRegex, '')
                        .replace(/\r\n/g, '\n')
                        .replace(/\r/, '')
                        .trim();

                    if (opts?.verbose) {
                        this.log.log(LogLevel.DEBUG, `SPAWN OUT: ${data}`);
                    }
                    if (opts?.stdOutHandler) {
                        opts?.stdOutHandler(data);
                    }
                    stdout += data;
                });

                const onExit = pty.onExit((event) => {
                    const code = event.exitCode;

                    if (opts?.verbose) {
                        this.log.log(LogLevel.DEBUG, `Spawned process exited with code ${code}`);
                        this.log.log(LogLevel.DEBUG, `Duration: ${new Date().valueOf() - startTS}`);
                    }

                    if (inputHandlerSet) {
                        process.stdin.removeAllListeners('data');
                        process.stdin?.ref?.();
                    }

                    setTimeout(
                        () => {
                            onData.dispose();
                            onExit.dispose();
                            pty.kill();
                        },
                        10,
                    );
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

@singleton()
@injectable()
export class WindowsProcessFetcher extends IService implements IProcessFetcher {

    private static readonly WMIC_VALUES = Object.keys(new ProcessEntry());

    public constructor(
        loggerFactory: LoggerFactory,
        private spawner: ProcessSpawner,
        private paths: Paths,
    ) {
        super(loggerFactory.createLogger('WinProcesses'));
    }

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

@singleton()
@injectable()
export class Processes extends IService implements IProcessSpawner, IProcessFetcher {

    public static pageSize: number | null = null;

    public constructor(
        loggerFactory: LoggerFactory,
        private spawner: ProcessSpawner,
        private windowsProcessFetcher: WindowsProcessFetcher,
        private paths: Paths,
        @inject(InjectionTokens.fs) private fs: FSAPI,
    ) {
        super(loggerFactory.createLogger('Processes'));
    }


    public async getProcessList(exeName?: string): Promise<ProcessEntry[]> {

        if (detectOS() === 'windows') {
            return this.windowsProcessFetcher.getProcessList(exeName);
        }

        if (!Processes.pageSize) {
            const pageSizeOutput = await this.spawner.spawnForOutput(
                'getconf',
                ['PAGESIZE'],
                {
                    dontThrow: true,
                },
            );
            if (pageSizeOutput.status === 0 && Number(pageSizeOutput.stdout)) {
                Processes.pageSize = Number(pageSizeOutput.stdout);
            } else {
                Processes.pageSize = 4096; // some default
            }
        }
        return await this.fs.promises.readdir('/proc')
            .then(
                /* istanbul ignore next */ (result) => Promise.all(
                    result.map(
                        /* istanbul ignore next */ async (pid) => {
                            if (!Number(pid)) return;
                            try {
                                const stat = await this.fs.promises.stat(`/proc/${pid}`);
                                if (stat?.isDirectory() && stat.uid === process.getuid()) {
                                    const now = new Date().valueOf();
                                    const uptime = os.uptime();
                                    const details = await Promise.all([
                                        this.fs.promises.readlink(`/proc/${pid}/exe`, { encoding: 'utf-8' }),
                                        this.fs.promises.readFile(`/proc/${pid}/cmdline`, { encoding: 'utf-8' }),
                                        this.fs.promises.readFile(`/proc/${pid}/stat`, { encoding: 'utf-8' }),
                                        this.fs.promises.readFile(`/proc/${pid}/statm`, { encoding: 'utf-8' }),
                                    ]);

                                    // see https://man7.org/linux/man-pages/man5/proc.5.html
                                    const pstat = details[2].split(' ');
                                    const pstatm = details[3].split(' ');

                                    /* eslint-disable @typescript-eslint/naming-convention */
                                    return {
                                        Name: pid,
                                        ProcessId: pid,
                                        ExecutablePath: details[0],
                                        CommandLine: details[1].split('\0').join(' ').trim(),
                                        PrivatePageCount: String(Number(pstatm[0]) * Processes.pageSize),
                                        CreationDate: String(now - (uptime - Number(pstat[21]) / 100) * 1000),
                                        UserModeTime: String(Number(pstat[13]) * 1000),
                                        KernelModeTime: String(Number(pstat[14]) * 1000),
                                    }
                                    /* eslint-enable @typescript-eslint/naming-convention */
                                }
                            } catch {}
                            return null;
                        },
                    ),
                ),
            )
            .then( /* istanbul ignore next */(list) => list
                .filter(/* istanbul ignore next */ (x) => !!x?.ExecutablePath)
                .filter(/* istanbul ignore next */ (x) => this.paths.samePath(x?.ExecutablePath, exeName)),
            );
    }

    public getProcessCPUSpent(proc: ProcessEntry): number {
        return (Number(proc.UserModeTime) / 10000)
        + (Number(proc.KernelModeTime) / 10000);
    }

    /* istanbul ignore next */
    public getProcessUptime(proc: ProcessEntry): number {
        const start = new Date(proc.CreationDate).valueOf() || new Date().valueOf();
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

    /**
     * Method proxy to be able to mock process exit.
     *
     * @param status process exit code
     */
    /* istanbul ignore next */
    public exit(status: number): never {
        return process['origExit'](status) as never;
    }

}
