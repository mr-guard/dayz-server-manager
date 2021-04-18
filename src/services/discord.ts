import {
    TextChannel,
    Client,
    Message,
} from 'discord.js';
import { DiscordMessageHandler } from '../interface/discord-message-handler';
import { StatefulService } from '../types/service';
import { Logger, LogLevel } from '../util/logger';
import { Manager } from '../control/manager';

export class DiscordBot implements StatefulService {

    private static log = new Logger('Discord');

    public client: Client | undefined;

    private messageHandler: DiscordMessageHandler;

    private debug: boolean = false;

    public constructor(
        public manager: Manager,
    ) {
        this.messageHandler = new DiscordMessageHandler(
            manager,
            this,
        );
    }

    public async start(): Promise<void> {

        if (!this.manager.config.discordBotToken) {
            DiscordBot.log.log(LogLevel.WARN, 'Not starting discord bot, because no bot token was provided');
            return;
        }

        this.client = new Client();
        this.client.on('ready', () => this.onReady());
        if (this.debug) {
            this.client.on('invalidated', () => DiscordBot.log.log(LogLevel.ERROR, 'invalidated'));
            this.client.on('debug', (m) => DiscordBot.log.log(LogLevel.DEBUG, m));
            this.client.on('warn', (m) => DiscordBot.log.log(LogLevel.WARN, m));
        }
        this.client.on('message', (m) => this.onMessage(m));
        this.client.on('disconnect', (d) => DiscordBot.log.log(LogLevel.ERROR, 'disconnect', d));
        this.client.on('error', (e) => DiscordBot.log.log(LogLevel.ERROR, 'error', e));
        await this.client.login(this.manager.config?.discordBotToken);
    }

    private onReady(): void {
        DiscordBot.log.log(LogLevel.IMPORTANT, 'Discord Ready!');
    }

    private onMessage(message: Message): void {
        if (message.author.bot) {
            return;
        }

        if (this.debug) {
            DiscordBot.log.log(LogLevel.DEBUG, `Detected message: ${message.content}`);
        }

        if (message.content?.startsWith('!')) {
            void this.messageHandler.handleCommandMessage(message);
        }
    }

    public async stop(): Promise<void> {
        if (this.client) {
            await this.client.destroy();
            this.client = undefined;
        }
    }

    public async relayRconMessage(message: string): Promise<void> {

        if (!this.client) {
            return;
        }

        const rconChannels = this.manager.config?.discordChannels.filter((x) => x.mode === 'rcon');
        const matching = this.client?.guilds?.first()?.channels?.filter((channel) => {
            return rconChannels?.some((x) => x.channel === channel.name?.toLowerCase()) ?? false;
        }).array() ?? [];
        for (const x of matching) {
            try {
                await (x as TextChannel).send(message);
            } catch (e) {
                DiscordBot.log.log(LogLevel.ERROR, `Error relaying message to channel: ${x.name}`, e);
            }
        }
    }

}
