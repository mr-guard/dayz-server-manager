import { Hook, HookType, HookTypeEnum } from '../config/config';
import { Manager } from '../control/manager';
import { IService } from '../types/service';
import { Logger, LogLevel } from '../util/logger';
import { Processes } from '../util/processes';


export class Hooks implements IService {

    private log = new Logger('Hooks');

    private processes = new Processes();

    public constructor(
        public manager: Manager,
    ) {}

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

                    void this.manager.discord?.relayRconMessage(msg);
                }
            }
        }
    }

}
