import { IStatefulService } from '../types/service';
import { Manager } from '../control/manager';
import * as cron from 'node-schedule';
import { LogLevel } from '../util/logger';
import { ServerState } from '../types/monitor';
import { Event } from '../config/config';
import { injectable, singleton } from 'tsyringe';
import { LoggerFactory } from './loggerfactory';
import { RCON } from './rcon';
import { Monitor } from './monitor';
import { Backups } from './backups';
import { EventBus } from '../control/event-bus';
import { InternalEventTypes } from '../types/events';

@singleton()
@injectable()
export class Events extends IStatefulService {

    private tasks: cron.Job[] = [];

    private skipEvents: boolean = process.argv.includes('--skip-events');

    public constructor(
        logerFactory: LoggerFactory,
        private manager: Manager,
        private monitor: Monitor,
        private rcon: RCON,
        private backup: Backups,
        private eventBus: EventBus,
    ) {
        super(logerFactory.createLogger('Events'));
    }

    public async start(): Promise<void> {
        for (const event of (this.manager.config.events ?? [])) {

            const job = cron.scheduleJob(
                event.name,
                event.cron,
                () => {
                    if (this.skipEvents) {
                        this.log.log(LogLevel.IMPORTANT, `Skipping task '${event.name}' (${event.type}) because events are skipped`);
                        return;
                    }

                    try {
                        this.execute(event);
                    } catch (e) {
                        this.log.log(
                            LogLevel.ERROR,
                            `Error executing task '${event.name}' (${event.type}). Check your config for errors!`,
                            e,
                        );
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

    private runTask(event: Event, task: () => Promise<any>): void {
        void task()
            ?.then(() => {
                this.log.log(LogLevel.DEBUG, `Successfully executed task '${event.name}'`);
            })
            ?.catch(/* istanbul ignore next */ () => {
                this.log.log(LogLevel.WARN, `Failed to execute task '${event.name}'`);
            });
    };

    private checkStartedAndRun(event: Event, task: () => Promise<any>): void {
        if (this.monitor.serverState !== ServerState.STARTED) {
            this.log.log(LogLevel.WARN, `Skipping '${event.name}' because server is not in STARTED state`);
            return;
        }

        this.runTask(event, task);
    };

    private execute(event: Event): void {
        this.log.log(LogLevel.DEBUG, `Executing task '${event.name}' (${event.type})`);
        switch (event.type) {
            case 'restart': {
                this.checkStartedAndRun(event, async () => {
                    this.eventBus.emit(
                        InternalEventTypes.DISCORD_MESSAGE,
                        {
                            type: 'notification',
                            message: 'Executing planned Restart!',
                        },
                    );
                    await this.monitor.killServer();
                });
                break;
            }
            case 'message': {
                if (!event.params?.[0]) {
                    this.log.log(
                        LogLevel.ERROR,
                        `Message task '${event.name}' (${event.type}) is missing the message. Check your config!`,
                    );
                }
                this.checkStartedAndRun(event, () => this.rcon.global(event.params[0]));
                break;
            }
            case 'kickAll': {
                this.checkStartedAndRun(event, () => void this.rcon.kickAll());
                break;
            }
            case 'lock': {
                this.checkStartedAndRun(event, () => void this.rcon.lock());
                break;
            }
            case 'unlock': {
                this.checkStartedAndRun(event, () => void this.rcon.unlock());
                break;
            }
            case 'backup': {
                this.runTask(event, () => this.backup.createBackup());
                break;
            }
            default: {
                break;
            }
        }
    }

}
