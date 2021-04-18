
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

// eslint-disable-next-line @typescript-eslint/naming-convention
const LogLevelFncs = [
    console.log,
    console.log,
    console.log,
    console.warn,
    console.error,
];

export class Logger {

    public static readonly LOG_LEVELS: { [context: string]: LogLevel } = {};
    public static defaultLogLevel: LogLevel = LogLevel.INFO;

    private readonly CONTEXT_LENGTH = 10;

    public constructor(
        private context: string,
    ) {}

    private formatContext(context: string): string {
        if (context.length >= this.CONTEXT_LENGTH) {
            return context.slice(0, this.CONTEXT_LENGTH);
        }
        return context.padEnd(this.CONTEXT_LENGTH);
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

            if (data?.length) {
                LogLevelFncs[level](fmt, data);
            } else {
                LogLevelFncs[level](fmt);
            }
        }

    }

}
