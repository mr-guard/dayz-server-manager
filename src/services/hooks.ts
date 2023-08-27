import { Hook, HookType, HookTypeEnum } from '../config/config';
import { Manager } from '../control/manager';
import { IService } from '../types/service';
import { LogLevel } from '../util/logger';
import { Processes } from '../services/processes';
import { LoggerFactory } from './loggerfactory';
import { injectable, singleton } from 'tsyringe';
import { EventBus } from '../control/event-bus';
import { InternalEventTypes } from '../types/events';

@singleton()
@injectable()
export class Hooks extends IService {

    public constructor(
        loggerFactory: LoggerFactory,
        private manager: Manager,
        private processes: Processes,
        private eventBus: EventBus,
    ) {
        super(loggerFactory.createLogger('Hooks'));
    }

    public getHooks(type: HookType): Hook[] {
        return (this.manager.config.hooks ?? []).filter((x) => x.type === type);
    }

    public async executeHooks(hookType: HookTypeEnum): Promise<void> {
        const hooks = this.getHooks(hookType);
        if (hooks.length) {
            for (const hook of hooks) {
                this.log.log(LogLevel.DEBUG, `Executing beforeStart Hook (${hook.program} ${(hook.params ?? []).join(' ')})`);
                const hookOut = await this.processes.spawnForOutput(
                    hook.program,
                    hook.params ?? [],
                    {
                        dontThrow: true,
                    },
                );
                if (hookOut?.status === 0) {
                    this.log.log(LogLevel.INFO, `beforeStart Hook (${hook.program} ${(hook.params ?? []).join(' ')}) succeed`);
                } else {
                    const msg = `beforeStart Hook (${hook.program} ${(hook.params ?? []).join(' ')}) failed`;
                    this.log.log(LogLevel.ERROR, msg, hookOut);

                    this.eventBus.emit(
                        InternalEventTypes.DISCORD_MESSAGE,
                        {
                            type: 'admin',
                            message: msg,
                        },
                    );
                }
            }
        }
    }

}
