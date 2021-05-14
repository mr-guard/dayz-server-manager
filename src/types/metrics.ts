import { Request } from './interface';

// eslint-disable-next-line no-shadow
export enum MetricTypeEnum {
    SYSTEM = 'SYSTEM',
    PLAYERS = 'PLAYERS',
    AUDIT = 'AUDIT',
    INGAME_PLAYERS = 'INGAME_PLAYERS',
    INGAME_VEHICLES = 'INGAME_VEHICLES',
}

export type MetricType = keyof typeof MetricTypeEnum;

export interface MetricWrapper<T> {
    timestamp: number;
    value: T;
}

export type MetricsContainer = {
    [Property in MetricType]: MetricWrapper<any>[];
};

export interface AuditEvent extends MetricWrapper<Request> {
    user: string;
}
