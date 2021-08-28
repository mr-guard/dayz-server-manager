import { IStatefulService } from '../types/service';
import { Manager } from '../control/manager';
import * as cron from 'node-schedule';
import { Logger, LogLevel } from '../util/logger';
import { ServerState } from '../types/monitor';

export class Events implements IStatefulService {

    private log = new Logger('Events');

    private tasks: cron.Job[] = [];

    public constructor(
        public manager: Manager,
    ) {}

    public async start(): Promise<void> {
        for (const event of (this.manager.config.events ?? [])) {

            const runTask = async (task: () => Promise<any>): Promise<any> => {
                void task()
                    ?.then(() => {
                        this.log.log(LogLevel.DEBUG, `Successfully executed task '${event.name}'`);
                    })
                    ?.catch(() => {
                        this.log.log(LogLevel.WARN, `Failed to execute task '${event.name}'`);
                    });
            };

            const checkAndRun = async (task: () => Promise<any>): Promise<void> => {
                if (this.manager?.monitor?.serverState !== ServerState.STARTED) {
                    this.log.log(LogLevel.WARN, `Skipping '${event.name}' because server is not in STARTED state`);
                    return;
                }

                void runTask(task);
            };

            const job = cron.scheduleJob(
                event.name,
                event.cron,
                () => {
                    this.log.log(LogLevel.DEBUG, `Executing task '${event.name}' (${event.type})`);
                    switch (event.type) {
                        case 'restart': {
                            void checkAndRun(async () => {
                                await this.manager.discord.relayRconMessage('Scheduled Restart!');
                                await this.manager.monitor.killServer();
                            });
                            break;
                        }
                        case 'message': {
                            void checkAndRun(() => this.manager.rcon.global(event.params[0]));
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
                            void runTask(() => this.manager.backup.createBackup());
                            break;
                        }
                        default: {
                            break;
                        }
                    }
                },
            );

            this.log.log(
                LogLevel.INFO,
                `Scheduled '${event.name}' with pattern: ${event.cron} (Next run: ${job.nextInvocation().toISOString()})`,
            );

            this.tasks.push(job);
        }
    }

    public async stop(): Promise<void> {
        for (const task of this.tasks) {
            try {
                task.cancel();
            } catch (e) {
                this.log.log(LogLevel.DEBUG, `Stopping event schedule for '${task.name}' failed`, e);
            }
        }
        this.tasks = [];
    }

}
