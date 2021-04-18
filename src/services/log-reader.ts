
import { Manager } from '../control/manager';
import { StatefulService } from '../types/service';
import { Logger, LogLevel } from '../util/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as tail from 'tail';
import { ServerState } from '../types/monitor';
import { FileDescriptor, LogMessage, LogType, LogTypeEnum } from '../types/log-reader';

export interface LogContainer {
    logFiles?: FileDescriptor[];
    logLines?: LogMessage[];
    tail?: tail.Tail;
    filter: (file: string) => boolean;
}

export type LogMap = {
    [Property in LogType]?: LogContainer;
};

export class LogReader implements StatefulService {

    private static log = new Logger('LogReader');

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

    public constructor(
        public manager: Manager,
    ) {}

    public async start(): Promise<void> {
        this.manager.monitor.registerStateListener((x) => {
            if (x === ServerState.STARTED) {
                setTimeout(async () => {
                    void this.registerReaders();
                }, 5000);
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

        for (const type of Object.keys(LogTypeEnum)) {
            const logContainer = this.logMap[type as LogType];
            logContainer.logLines = [];
            if (logContainer.logFiles.length) {
                logContainer.tail = new tail.Tail(logContainer.logFiles[0].file, { follow: true, fromBeginning: true, flushAtEOF: true });
                logContainer.tail.on('line', (line) => {
                    if (line) {
                        LogReader.log.log(LogLevel.DEBUG, `${type} - ${line}`);
                        logContainer.logLines.push({
                            timestamp: new Date().valueOf(),
                            message: line,
                        });
                    }
                });
            }
        }
    }

    public async fetchLogs(type: LogType, since?: number): Promise<LogMessage[]> {
        const logs = this.logMap[type]?.logLines ?? [];
        return since ? logs.filter((x) => x.timestamp > since) : logs;
    }

}
