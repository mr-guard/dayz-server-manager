
// eslint-disable-next-line no-shadow
export enum WebsocketCommand {
    REGISTER_LISTENER = 'REGISTER_LISTENER',
    LISTENER_EVENT = 'LISTENER_EVENT',

    REQUEST = 'REQUEST',
    RESPONSE = 'RESPONSE',
}

// eslint-disable-next-line no-shadow
export enum WebsocketListenerType {
    LOGS = 'logs',
    METRICS = 'metrics',
}

export interface WebsocketListenerEvent {
    type: WebsocketListenerType,
    event: any,
}

export interface WebsocketMessage<T> {

    cmd: WebsocketCommand;
    data: T;

}