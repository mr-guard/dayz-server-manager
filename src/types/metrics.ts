/* istanbul ignore file */

import { Request } from './interface';

/* eslint-disable no-shadow */
export enum MetricTypeEnum {
    SYSTEM = 'SYSTEM',
    PLAYERS = 'PLAYERS',
    AUDIT = 'AUDIT',
    INGAME_PLAYERS = 'INGAME_PLAYERS',
    INGAME_VEHICLES = 'INGAME_VEHICLES',
}
/* eslint-enable no-shadow */

export type MetricType = keyof typeof MetricTypeEnum;

export interface MetricWrapper<T> {
    timestamp: number;
    value: T;
}

export interface AuditEvent extends MetricWrapper<Request> {
    user: string;
}

export interface MetricEntryEvent {
    type: MetricType,
    entry: MetricWrapper<any>,
}
