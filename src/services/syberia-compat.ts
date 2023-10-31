/* istanbul ignore file */
/* No tests because it is experimental and changes a lot */

import { inject, injectable, singleton } from 'tsyringe';
import { IStatefulService } from '../types/service';
import { LoggerFactory } from './loggerfactory';
import { Paths } from './paths';
import { Manager } from '../control/manager';
import { EventBus } from '../control/event-bus';
import { FSAPI, InjectionTokens } from '../util/apis';
import { InternalEventTypes } from '../types/events';
import * as path from 'path';
import { LogLevel } from '../util/logger';

@singleton()
@injectable()
export class SyberiaCompat extends IStatefulService {

    public readonly MOD_NAME = '@DayZServerManagerSyberia';
    public readonly SYBERIA_MOD_ID = '2569522069';

    public constructor(
        loggerFactory: LoggerFactory,
        private manager: Manager,
        private paths: Paths,
        private eventBus: EventBus,
        @inject(InjectionTokens.fs) private fs: FSAPI,
    ) {
        super(loggerFactory.createLogger('SyberiaCompat'));

        this.eventBus.on(
            InternalEventTypes.INTERNAL_MOD_INSTALL,
            () => this.installMod(),
        );
        this.eventBus.on(
            InternalEventTypes.GET_INTERNAL_MODS,
            async () => this.getServerMods(),
        );
    }

    public async start(): Promise<void> {
        // ignore
    }

    public async stop(): Promise<void> {
        // ignore
    }

    public async installMod(): Promise<void> {

        if (!this.manager.config.syberiaCompat) {
            return;
        }

        const serverPath = this.manager.getServerPath();

        const modsPath = path.join(__dirname, '../mods');
        const mods = this.fs.readdirSync(modsPath);

        for (const mod of mods) {
            const serverModPath = path.join(serverPath, mod);
            if (this.fs.existsSync(serverModPath)) {
                if (!this.paths.removeLink(serverModPath)) {
                    this.log.log(LogLevel.ERROR, `Could not remove mod ${mod} before copying new files`);
                    return;
                }
            }
        }

        this.paths.copyFromPkg(modsPath, serverPath);

    }

    public getServerMods(): string[] {

        if (!this.manager.config.syberiaCompat) {
            return [];
        }

        const mods = [];
        if (
            this.manager.getModIdList().includes(this.SYBERIA_MOD_ID)
        ) {
            mods.push(this.MOD_NAME);
        }
        return mods;
    }

}
