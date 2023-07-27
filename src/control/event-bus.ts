import { injectable, singleton } from 'tsyringe';
import { IService } from '../types/service';
import { LoggerFactory } from '../services/loggerfactory';

import { EventEmitter2, Listener } from 'eventemitter2';
import { InternalEventTypes } from '../types/events';
import { CommandMap, Request, Response } from '../types/interface';
import { ServerState } from '../types/monitor';

@singleton()
@injectable()
export class EventBus extends IService {

    private readonly EVENT_EMITTER = new EventEmitter2();

    public constructor(
        loggerfactory: LoggerFactory,
    ) {
        super(loggerfactory.createLogger('EventBus'));
    }

    public request(name: InternalEventTypes.INTERFACE_COMMANDS, data?: any): Promise<CommandMap>;
    public request(name: InternalEventTypes.INTERFACE_REQUEST, request: Request): Promise<Response>;
    public async request(name: InternalEventTypes, data?: any): Promise<any> {
        const response = await this.EVENT_EMITTER.emitAsync(name, data);
        return response ? response[0] : undefined;
    }

    public emit(name: InternalEventTypes.DISCORD_MESSAGE, message: string): void;
    public emit(name: InternalEventTypes.MONITOR_STATE_CHANGE, newState: ServerState, previousState: ServerState): void;
    public emit(name: InternalEventTypes, data?: any): void {
        this.EVENT_EMITTER.emit(name, data);
    }

    public on(name: InternalEventTypes.INTERFACE_COMMANDS, listener: () => Promise<CommandMap>): Listener;
    public on(name: InternalEventTypes.INTERFACE_REQUEST, listener: (request: Request) => Promise<Response>): Listener;
    public on(name: InternalEventTypes.DISCORD_MESSAGE, listener: (message: string) => Promise<any>): Listener;
    public on(name: InternalEventTypes.MONITOR_STATE_CHANGE, listener: (newState: ServerState, previousState: ServerState) => Promise<any>): Listener;
    public on(name: InternalEventTypes, listener: (...data: any[]) => Promise<any>): Listener {
        return this.EVENT_EMITTER.on(name, listener, { objectify: true }) as Listener;
    }

    public clear(name: InternalEventTypes): void {
        this.EVENT_EMITTER.removeAllListeners(name);
    }

}
