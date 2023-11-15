import {
    TextChannel,
    Client,
    Message,
} from 'discord.js';
import { DiscordMessageHandler } from '../interface/discord-message-handler';
import { IStatefulService } from '../types/service';
import { LogLevel } from '../util/logger';
import { Manager } from '../control/manager';
import { injectable, singleton } from 'tsyringe';
import { LoggerFactory } from './loggerfactory';
import { EventBus } from '../control/event-bus';
import { InternalEventTypes } from '../types/events';
import { DiscordMessage, isDiscordChannelType } from '../types/discord';

@singleton()
@injectable()
export class DiscordBot extends IStatefulService {

    public client: Client | undefined;
    private ready = false;

    private msgQueue: DiscordMessage[] = [];

    public debug: boolean = false;

    public constructor(
        loggerFactory: LoggerFactory,
        private manager: Manager,
        private messageHandler: DiscordMessageHandler,
        private eventBus: EventBus,
    ) {
        super(loggerFactory.createLogger('Discord'));

        this.eventBus.on(
            InternalEventTypes.DISCORD_MESSAGE,
            /* istanbul ignore next */ (message: DiscordMessage) => this.sendMessage(message),
        );
    }

    public async start(): Promise<void> {

        if (!this.manager.config.discordBotToken) {
            this.log.log(LogLevel.WARN, 'Not starting discord bot, because no bot token was provided');
            return;
        }

        try {
            const client = new Client();
            client.on('ready', () => this.onReady());
            if (this.debug) {
                client.on('invalidated', () => this.log.log(LogLevel.ERROR, 'invalidated'));
                client.on('debug', (m) => this.log.log(LogLevel.DEBUG, m));
                client.on('warn', (m) => this.log.log(LogLevel.WARN, m));
            }
            client.on('message', (m) => this.onMessage(m));
            client.on('disconnect', (d) => {
                if (d?.wasClean) {
                    this.log.log(LogLevel.INFO, 'disconnect');
                } else {
                    this.log.log(LogLevel.ERROR, 'disconnect', d);
                }
            });
            client.on('error', (e) => this.log.log(LogLevel.ERROR, 'error', e));
            await client.login(this.manager.config.discordBotToken);
            this.client = client;
            this.sendQueuedMessage();
        } catch (e) {
            this.log.log(LogLevel.WARN, 'Not starting discord bot, login failed', e);
        }
    }

    private onReady(): void {
        this.log.log(LogLevel.IMPORTANT, 'Discord Ready!');
        this.ready = true;
        this.sendQueuedMessage();
    }

    private sendQueuedMessage(): void {
        setTimeout(() => {
            const msgQueue = this.msgQueue;
            this.msgQueue = [];
            for (const msg of msgQueue) {
                void this.sendMessage(msg);
            }
        }, 1000);
    }

    private onMessage(message: Message): void {
        if (message.author.bot) {
            return;
        }

        if (this.debug) {
            this.log.log(LogLevel.DEBUG, `Detected message: ${message.content}`);
        }

        if (message.content?.startsWith(this.messageHandler.PREFIX)) {
            void this.messageHandler.handleCommandMessage(message);
        }
    }

    public async stop(): Promise<void> {
        this.ready = false;
        if (this.client) {
            await this.client.destroy();
            this.client = undefined;
        }
    }

    public async sendMessage(message: DiscordMessage): Promise<void> {

        if (!this.client || !this.ready) {
            this.log.log(LogLevel.WARN, `Queueing message because client did not start or is not yet ready`, this.ready);
            this.msgQueue.push(message);
            return;
        }

        const channels = this.manager.config.discordChannels
            ?.filter((x) => isDiscordChannelType(x.mode, message.type));
        const matching = this.client?.guilds?.first()?.channels
            ?.filter((channel) => {
                return channels?.some((x) => x.channel === channel.name?.toLowerCase()) ?? false;
            }).array() || [];
        for (const x of matching) {
            try {
                if (message.message) {
                    await (x as TextChannel).send(message.message);
                }
                if (message.embeds?.length) {
                    for (const embed of message.embeds) {
                        await (x as TextChannel).sendEmbed(embed);
                    }
                }
            } catch (e) {
                this.log.log(LogLevel.ERROR, `Error relaying message to channel: ${x.name}`, e);
            }
        }
    }

}
