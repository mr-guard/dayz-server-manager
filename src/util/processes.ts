import { spawn, SpawnOptions } from 'child_process';
import * as os from 'os';
import { Logger, LogLevel } from './logger';
import { merge } from './merge';

export class ProcessEntry {

    /* eslint-disable @typescript-eslint/naming-convention */
    public Name: string = '';
    public ProcessId: string = '';
    public ExecutablePath: string = '';
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

export class Processes {

    private static log = new Logger('Processes');

    private static values = Object.keys(new ProcessEntry());

    public static async getProcessList(where?: string): Promise<ProcessEntry[]> {
        const result = await Processes.spawnForOutput(
            'cmd',
            [
                '/c',
                [
                    'wmic',
                    'process',
                    'get',
                    ...(where ? ['where', `${where}`] : []),
                    `${Processes.values.join(',')}`,
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
                            .map((y) => y.split('=').map((z) => z.trim())),
                    )
                    .map((x: string[][]) => {
                        let proc = new ProcessEntry();
                        x.forEach((y) => proc = merge(proc, { [y[0]]: y[1] }));
                        return proc;
                    }),
            );
        }
        return procs;
    }

    public static getProcessCPUSpent(proc: ProcessEntry): number {
        return (Number(proc.UserModeTime) / 10000)
        + (Number(proc.KernelModeTime) / 10000);
    }

    public static getProcessUptime(proc: ProcessEntry): number {
        const start = new Date(proc.CreationDate).valueOf();
        const now = new Date().valueOf();
        return (now - start);
    }

    public static getProcessCPUUsage(proc: ProcessEntry, prev?: ProcessEntry): number {
        let curSpent = Processes.getProcessCPUSpent(proc);
        let curUp = Processes.getProcessUptime(proc);

        if (prev) {
            curSpent -= Processes.getProcessCPUSpent(proc);
            curUp -= Processes.getProcessUptime(proc);
        }

        return Math.round(
            (
                (curSpent / curUp) * 100
            ) / Math.max(os.cpus().length, 1),
        );
    }

    public static killProcess(pid: string): Promise<void> {
        return new Promise<void>((r, e) => {
            const kill = spawn(
                'taskkill',
                [
                    '/F', // check if force is neccessary
                    '/PID',
                    pid,
                ],
            );
            kill.on('close', (error) => {
                if (error) {
                    e(error);
                } else {
                    r();
                }
            });
        });
    }

    public static getSystemUsage(): SystemInfo {
        return merge(new SystemInfo(), {
            cpu: os.cpus(),
            avgLoad: os.loadavg(),
            memTotal: os.totalmem(),
            memFree: os.freemem(),
            uptime: os.uptime(),
        });
    }

    public static async spawnForOutput(
        cmd: string,
        args?: string[],
        opts?: {
            verbose?: boolean;
            ignoreCodes?: number[];
            spawnOpts?: SpawnOptions | any;
            dontThrow?: boolean;
            stdOutHandler?: (data: string) => any;
            stdErrHandler?: (data: string) => any;
        },
    ): Promise<{
            status: number;
            stdout: string;
            stderr: string;
        }> {
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
                            Processes.log.log(LogLevel.DEBUG, `SPAWN OUT: ${data}`);
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
                            Processes.log.log(LogLevel.ERROR, `SPAWN ERR: ${data}`);
                        }
                        if (opts?.stdErrHandler) {
                            opts?.stdErrHandler(data);
                        }
                        stderr += data;
                    });
                }

                spawnedProcess.on('error', (error) => {
                    Processes.log.log(LogLevel.ERROR, error.message, error);
                });

                spawnedProcess.on('close', (code) => {

                    if (!spawnedProcess.stdout || !spawnedProcess.stderr) {
                        console.log('\n');
                    }

                    if (opts?.verbose) {
                        Processes.log.log(LogLevel.DEBUG, `Spawned process exited with code ${code}`);
                        Processes.log.log(LogLevel.DEBUG, `Duration: ${new Date().valueOf() - startTS}`);
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
