/* istanbul ignore file */

export interface FileDescriptor {
    file: string;
    mtime: number;
}

export interface LogMessage {
    timestamp: number;
    message: string;
}

/* eslint-disable no-shadow */
export enum LogTypeEnum {
    SCRIPT = 'SCRIPT',
    ADM = 'ADM',
    RPT = 'RPT',
}
/* eslint-enable no-shadow */

export type LogType = keyof typeof LogTypeEnum;

export interface LogEntryEvent {
    type: LogType,
    entry: LogMessage,
}
