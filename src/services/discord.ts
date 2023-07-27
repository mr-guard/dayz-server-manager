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

@singleton()
@injectable()
export class DiscordBot extends IStatefulService {

    public client: Client | undefined;
    private ready = false;

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
            /* istanbul ignore next */ (message: string) => this.relayRconMessage(message),
        );
    }

    public async start(): Promise<void> {

        if (!this.manager.config.discordBotToken) {
            this.log.log(LogLevel.WARN, 'Not starting discord bot, because no bot token was provided');
            return;
        }

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

        try {
            await client.login(this.manager.config.discordBotToken);
            this.client = client;
        } catch (e) {
            this.log.log(LogLevel.WARN, 'Not starting discord bot, login failed', e);
        }
    }

    private onReady(): void {
        this.log.log(LogLevel.IMPORTANT, 'Discord Ready!');
        this.ready = true;
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

    public async relayRconMessage(message: string): Promise<void> {

        if (!this.client || !this.ready) {
            this.log.log(LogLevel.WARN, `Not sending message because client did not start or is not yet ready`);
            return;
        }

        const rconChannels = this.manager.config.discordChannels?.filter((x) => x.mode === 'rcon');
        const matching = this.client?.guilds?.first()?.channels?.filter((channel) => {
            return rconChannels?.some((x) => x.channel === channel.name?.toLowerCase()) ?? false;
        }).array() || [];
        for (const x of matching) {
            try {
                await (x as TextChannel).send(message);
            } catch (e) {
                this.log.log(LogLevel.ERROR, `Error relaying message to channel: ${x.name}`, e);
            }
        }
    }

}
