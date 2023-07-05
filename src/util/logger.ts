import * as fs from 'fs';

// eslint-disable-next-line no-shadow
export enum LogLevel {
    DEBUG = 0,
    INFO,
    IMPORTANT,
    WARN,
    ERROR,
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const LogLevelNames = [
    'DEBUG    ',
    'INFO     ',
    'IMPORTANT',
    'WARN     ',
    'ERROR    ',
];

export class Logger {

    public static readonly LOG_LEVELS: { [context: string]: LogLevel } = {};

    public static defaultLogLevel: LogLevel = LogLevel.INFO;
    public static defaultLogFile: string = 'server-manager.log';

    private static lastWrite: Promise<any> = Promise.resolve();

    public static wrapWithFileLogger(fnc: any): any {
        /* istanbul ignore next */
        return (msg: string, data: any[]) => {
            if (data?.length) {
                fnc(msg, data);
            } else {
                fnc(msg);
            }

            // sync to the last write
            this.lastWrite = this.lastWrite
                .then(/* istanbul ignore next */ () => {
                    return fs.promises.appendFile(
                        Logger.defaultLogFile,
                        `${msg} - ${JSON.stringify(data)}\n`,
                    ).then(
                        () => { /* ignore */ },
                        /* istanbul ignore next */
                        () => { /* ignore */ },
                    );
                });
        };

    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    public static LogLevelFncs = [
        Logger.wrapWithFileLogger(console.log),
        Logger.wrapWithFileLogger(console.log),
        Logger.wrapWithFileLogger(console.log),
        Logger.wrapWithFileLogger(console.warn),
        Logger.wrapWithFileLogger(console.error),
    ];

    public readonly MAX_CONTEXT_LENGTH = 12;

    public constructor(
        private context: string,
    ) {}

    private formatContext(context: string): string {
        if (context.length >= this.MAX_CONTEXT_LENGTH) {
            return context.slice(0, this.MAX_CONTEXT_LENGTH);
        }
        return context.padEnd(this.MAX_CONTEXT_LENGTH);
    }

    public log(
        level: LogLevel,
        msg: string,
        ...data: any[]
    ): void {

        const allowedLevel = Logger.LOG_LEVELS[this.context] ?? Logger.defaultLogLevel;
        if (level >= allowedLevel) {
            const date = false
                ? new Date().toLocaleString()
                : new Date().toISOString();
            const fmt = `@${date} | ${LogLevelNames[level]} | ${this.formatContext(this.context)} | ${msg}`;

            Logger.LogLevelFncs[level](fmt, data);
        }

    }

}
