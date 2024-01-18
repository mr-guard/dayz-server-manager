import { Manager } from '../control/manager';
import { ProcessEntry, Processes } from '../services/processes';
import { LogLevel } from '../util/logger';
import { IService } from '../types/service';
import { injectable, singleton } from 'tsyringe';
import { LoggerFactory } from './loggerfactory';

@singleton()
@injectable()
export class ServerDetector extends IService {

    private lastServerCheckResult?: { ts: number; result: ProcessEntry[] };

    public constructor(
        loggerFactory: LoggerFactory,
        private manager: Manager,
        private processes: Processes,
    ) {
        super(loggerFactory.createLogger('ServerDetector'));
    }

    public async getDayZProcesses(): Promise<ProcessEntry[]> {
        let processList: ProcessEntry[] = [];
        if (this.lastServerCheckResult?.ts && (new Date().valueOf() - this.lastServerCheckResult?.ts) < 1000) {
            processList = this.lastServerCheckResult.result;
        } else {
            processList = await this.processes.getProcessList(
                this.manager.getServerExePath(),
            );

            if (process.env['DZSM_DEBUG_PROCESS_LIST'] === 'true') {
                this.log.log(
                    LogLevel.DEBUG,
                    'Fetched new Process list',
                    processList,
                );
            }

            this.lastServerCheckResult = {
                ts: new Date().valueOf(),
                result: processList,
            };
        }
        return processList
            .map((x) => {
                if (x.CreationDate) {
                    const y = x.CreationDate.substr(0, 4);
                    const m = x.CreationDate.substr(4, 2);
                    const d = x.CreationDate.substr(6, 2);
                    const hour = x.CreationDate.substr(8, 2);
                    const minute = x.CreationDate.substr(10, 2);
                    const second = x.CreationDate.substr(12, 2);
                    return {
                        ...x,
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        CreationDate: `${y}-${m}-${d} ${hour}:${minute}:${second}`,
                    };
                }
                return x;
            });
    }

    public async isServerRunning(): Promise<boolean> {
        const processes = await this.getDayZProcesses();
        return processes.length > 0;
    }

}
