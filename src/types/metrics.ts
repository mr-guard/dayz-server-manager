import { Request } from './interface';

// eslint-disable-next-line no-shadow
export enum MetricType {
    SYSTEM = 'SYSTEM',
    PLAYERS = 'PLAYERS',
    AUDIT = 'AUDIT',
    INGAME_PLAYERS = 'INGAME_PLAYERS',
    INGAME_VEHICLES = 'INGAME_VEHICLES',
}

export interface MetricWrapper<T> {
    timestamp: number;
    value: T;
}

export type MetricsContainer = {
    [Property in keyof typeof MetricType]: MetricWrapper<any>[];
};

export interface AuditEvent extends MetricWrapper<Request> {
    user: string;
}
