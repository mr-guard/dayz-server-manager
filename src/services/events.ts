import { StatefulService } from '../types/service';
import { Manager } from '../control/manager';
import * as cron from 'node-schedule';
import { Logger, LogLevel } from '../util/logger';

export class Events implements StatefulService {

    private log = new Logger('Events');

    private tasks: cron.Job[] = [];

    public constructor(
        public manager: Manager,
    ) {}

    public async start(): Promise<void> {
        for (const event of (this.manager.config.events ?? [])) {

            const checkAndRun = async (task: () => any): Promise<void> => {
                if (!await this.manager?.monitor?.isServerRunning()) {
                    this.log.log(LogLevel.WARN, `Skipping ${event.name} because server is not running`);
                    return;
                }
                task();
            };

            this.tasks.push(
                cron.scheduleJob(
                    event.name,
                    event.cron,
                    () => {
                        switch (event.type) {
                            case 'restart': {
                                void checkAndRun(() => void this.manager.monitor.killServer());
                                break;
                            }
                            case 'message': {
                                void checkAndRun(() => void this.manager.rcon.global(event.params[0]));
                                break;
                            }
                            case 'kickAll': {
                                void checkAndRun(() => void this.manager.rcon.kickAll());
                                break;
                            }
                            case 'lock': {
                                void checkAndRun(() => void this.manager.rcon.lock());
                                break;
                            }
                            case 'unlock': {
                                void checkAndRun(() => void this.manager.rcon.unlock());
                                break;
                            }
                            case 'backup': {
                                void this.manager.backup.createBackup();
                            }
                            default: {
                                break;
                            }
                        }
                    },
                ),
            );
        }
    }

    public async stop(): Promise<void> {
        for (const task of this.tasks) {
            try {
                task.cancel();
            } catch (e) {
                this.log.log(LogLevel.DEBUG, `Stopping event schedule for ${task.name} failed`, e);
            }
        }
        this.tasks = [];
    }

}
