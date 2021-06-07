
import { Manager } from '../control/manager';
import { IStatefulService } from '../types/service';
import { Logger, LogLevel } from '../util/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as tail from 'tail';
import { ServerState } from '../types/monitor';
import { FileDescriptor, LogMessage, LogType, LogTypeEnum } from '../types/log-reader';
import { reverseIndexSearch } from '../util/reverse-index-search';

export interface LogContainer {
    logFiles?: FileDescriptor[];
    logLines?: LogMessage[];
    tail?: tail.Tail;
    filter: (file: string) => boolean;
}

export type LogMap = {
    [Property in LogType]?: LogContainer;
};

export class LogReader implements IStatefulService {

    private log = new Logger('LogReader');

    /* eslint-disable @typescript-eslint/naming-convention */
    private logMap: LogMap = {
        SCRIPT: {
            filter: (x) => x.toLowerCase().startsWith('script') && x.toLowerCase().endsWith('.log'),
        },
        ADM: {
            filter: (x) => x.toLowerCase().endsWith('.adm'),
        },
        RPT: {
            filter: (x) => x.toLowerCase().endsWith('.rpt'),
        },
    };
    /* eslint-enable @typescript-eslint/naming-convention */

    private initDelay = 5000;

    public constructor(
        public manager: Manager,
    ) {}

    public async start(): Promise<void> {
        this.manager.monitor.registerStateListener('LogReader', (x) => {
            if (x === ServerState.STARTED) {
                setTimeout(() => {
                    void this.registerReaders();
                }, this.initDelay);
            }
        });
    }

    public async stop(): Promise<void> {
        for (const type of Object.keys(LogTypeEnum)) {
            const container = this.logMap[type as LogType];
            const t = container?.tail;
            if (t) {
                t.unwatch();
            }
            container.logFiles = [];
            container.logLines = [];
        }
    }

    private getProfilesDir(): string {
        const profiles = this.manager.config.profilesPath;
        if (!path.isAbsolute(profiles)) {
            return path.resolve(
                path.join(
                    this.manager.getServerPath(),
                    profiles,
                ),
            );
        }
        return profiles;
    }

    private async findLatestFiles(): Promise<void> {
        const profiles = this.getProfilesDir();
        const files = await fs.promises.readdir(profiles);

        const makeFileDescriptor = async (file: string): Promise<FileDescriptor> => {
            const fullPath = path.join(profiles, file);
            return {
                file: fullPath,
                mtime: (await fs.promises.stat(fullPath)).mtime.getTime(),
            };
        };

        for (const type of Object.keys(LogTypeEnum)) {
            this.logMap[type as LogType].logFiles = [];
        }

        for (const file of files) {
            for (const type of Object.keys(LogTypeEnum)) {
                const logContainer = this.logMap[type as LogType];
                if (logContainer.filter(file)) {
                    logContainer.logFiles.push(await makeFileDescriptor(file));
                }
            }
        }

        for (const type of Object.keys(LogTypeEnum)) {
            this.logMap[type as LogType].logFiles = this.logMap[type as LogType].logFiles
                .sort((a, b) => {
                    return b.mtime - a.mtime;
                });
        }
    }

    private async registerReaders(): Promise<void> {
        await this.findLatestFiles();

        const createTail = (type: string, logContainer: LogContainer, retry?: number): void => {
            logContainer.logLines = [];
            if (logContainer.logFiles?.length) {
                logContainer.tail = new tail.Tail(
                    logContainer.logFiles[0].file,
                    {
                        follow: true,
                        fromBeginning: true,
                        flushAtEOF: true,
                    },
                );
                logContainer.tail.on('error', (e) => {
                    this.log.log(LogLevel.WARN, `Error reading ${type}`, e);
                    logContainer.tail.unwatch();
                    if (!retry || retry < 1) {
                        setTimeout(
                            () => createTail(type, logContainer, (retry ?? 0) + 1),
                            10000,
                        );
                    }
                });
                logContainer.tail.on('line', (line) => {
                    if (line) {
                        this.log.log(LogLevel.DEBUG, `${type} - ${line}`);
                        logContainer.logLines.push({
                            timestamp: new Date().valueOf(),
                            message: line,
                        });
                    }
                });
            }
        };

        for (const type of Object.keys(LogTypeEnum)) {
            const logContainer = this.logMap[type as LogType];
            createTail(type, logContainer);
        }
    }

    public async fetchLogs(type: LogType, since?: number): Promise<LogMessage[]> {
        const logs = this.logMap[type]?.logLines ?? [];
        if (since && since > 0) {
            const idx = reverseIndexSearch(logs, (x) => x.timestamp <= since);
            if (idx !== -1) {
                if (idx + 1 >= logs.length) {
                    return [];
                }
                return logs.slice(idx + 1);
            }
        }
        return logs;
    }

}
