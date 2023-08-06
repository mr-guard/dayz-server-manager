
// eslint-disable-next-line no-shadow
export enum WebsocketCommand {
    REGISTER_LISTENER = 'REGISTER_LISTENER'
}

// eslint-disable-next-line no-shadow
export enum WebsocketListenerType {
    LOGS = 'logs',
    METRICS = 'metrics',
}

export interface WebsocketMessage<T> {

    cmd: WebsocketCommand;
    data: T;

}