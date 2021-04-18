export interface FileDescriptor {
    file: string;
    mtime: number;
}

export interface LogMessage {
    timestamp: number;
    message: string;
}

// eslint-disable-next-line no-shadow
export enum LogTypeEnum {
    SCRIPT = 'SCRIPT',
    ADM = 'ADM',
    RPT = 'RPT',
}

export type LogType = keyof typeof LogTypeEnum;

