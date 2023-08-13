import { Logger } from '../util/logger';

export class IService {

    public constructor(
        protected log: Logger,
    ) {}

}

export interface Timer {
    type: 'timeout' | 'interval';
    handle: any;
}

export class TimerHandler {
    protected timers = new Map<string, Timer>();

    public addInterval(name: string, cb: () => any, delay: number): void {
        this.timers.set(
            name,
            {
                type: 'interval',
                handle: setInterval(cb, delay),
            },
        );
    }

    public addTimeout(name: string, cb: () => any, delay: number): void {
        this.timers.set(
            name,
            {
                type: 'timeout',
                handle: setTimeout(cb, delay),
            },
        );
    }

    public removeTimer(name: string): void {
        const timer = this.timers.get(name);
        if (timer) {
            if (timer.type === 'interval') {
                clearInterval(timer.handle);
            } else if (timer.type === 'timeout') {
                clearTimeout(timer.handle);
            }
            this.timers.delete(name);
        }
    }

    public getTimer(name: string): Timer {
        return this.timers.get(name);
    }

    public removeAllTimers(): void {
        const timerNames = [...this.timers.keys()];
        for (const timerName of timerNames) {
            this.removeTimer(timerName);
        }
    }
}

export abstract class IStatefulService extends IService {

    protected timers = new TimerHandler();

    abstract start(): Promise<void>;
    abstract stop(): Promise<void>;

}

export interface ServiceConfig {
    type: typeof IService;
    stateful: boolean;
}
