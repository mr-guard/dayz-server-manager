import { IStatefulService } from '../types/service';
import { Manager } from '../control/manager';
import * as cron from 'node-schedule';
import { LogLevel } from '../util/logger';
import { ServerState } from '../types/monitor';
import { injectable, singleton } from 'tsyringe';
import { LoggerFactory } from './loggerfactory';
import { RCON } from './rcon';
import { Monitor } from './monitor';
import { Backups } from './backups';
import { DiscordBot } from './discord';

@singleton()
@injectable()
export class Events extends IStatefulService {

    private tasks: cron.Job[] = [];

    public constructor(
        logerFactory: LoggerFactory,
        private manager: Manager,
        private monitor: Monitor,
        private rcon: RCON,
        private backup: Backups,
        private discord: DiscordBot,
    ) {
        super(logerFactory.createLogger('Events'));
    }

    public async start(): Promise<void> {
        for (const event of (this.manager.config.events ?? [])) {

            const runTask = async (task: () => Promise<any>): Promise<any> => {
                void task()
                    ?.then(() => {
                        this.log.log(LogLevel.DEBUG, `Successfully executed task '${event.name}'`);
                    })
                    ?.catch(/* istanbul ignore next */ () => {
                        this.log.log(LogLevel.WARN, `Failed to execute task '${event.name}'`);
                    });
            };

            const checkAndRun = async (task: () => Promise<any>): Promise<void> => {
                if (this.monitor.serverState !== ServerState.STARTED) {
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
                                await this.discord.relayRconMessage('Scheduled Restart!');
                                await this.monitor.killServer();
                            });
                            break;
                        }
                        case 'message': {
                            void checkAndRun(() => this.rcon.global(event.params[0]));
                            break;
                        }
                        case 'kickAll': {
                            void checkAndRun(() => void this.rcon.kickAll());
                            break;
                        }
                        case 'lock': {
                            void checkAndRun(() => void this.rcon.lock());
                            break;
                        }
                        case 'unlock': {
                            void checkAndRun(() => void this.rcon.unlock());
                            break;
                        }
                        case 'backup': {
                            void runTask(() => this.backup.createBackup());
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
