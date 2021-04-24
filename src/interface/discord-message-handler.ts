import { GuildChannel, Message } from 'discord.js';
import { DiscordBot } from '../services/discord';
import { Manager } from '../control/manager';
import { Logger, LogLevel } from '../util/logger';
import { Request } from '../types/interface';

export class DiscordMessageHandler {

    private static log = new Logger('Discord');
    public readonly PREFIX = '!';

    public constructor(
        public manager: Manager,
        public discord: DiscordBot,
    ) {}

    public async handleCommandMessage(message: Message): Promise<void> {
        if (!this.manager.initDone) return;

        const args = message.content.slice(this.PREFIX.length).trim().split(/ +/);
        const command = args?.shift()?.toLowerCase();

        if (!command) return;

        const channelName = (message.channel as GuildChannel).name;
        const authorId = message.author.tag;

        if (!authorId?.includes('#')) {
            // safety
            return;
        }

        DiscordMessageHandler.log.log(LogLevel.INFO, `Command "${command}" from "${authorId}" in "${channelName}" with args: "${args?.join(' ')}"`);

        const handler = this.manager.interface.commandMap.get(command);
        if (!handler || handler.disableDiscord) {
            await message.reply('Command not found.');
            return;
        }

        const configChannel = this.manager.config.discordChannels.find((x) => x.channel.toLowerCase() === channelName?.toLowerCase());
        if (configChannel?.mode !== 'admin' && !handler.discordPublic) {
            await message.reply('This command is not allowed in this channel.');
            return;
        }

        const req = new Request();
        req.accept = 'text/plain';
        req.resource = command;
        req.user = authorId;

        if (handler.params?.length) {
            if (!handler.paramsOptional && handler.params.length !== args?.length) {
                await message.reply(`Wrong param count. Usage: ${this.PREFIX}${command} ${handler.params.join(' ')}`);
                return;
            }

            req.body = {};
            handler.params.forEach((x, i) => {
                if (i < args.length) {
                    req.body[x] = args[i];
                }
            });
        }

        const res = await this.manager.interface.execute(req);

        if (res.status >= 200 && res.status < 300) {
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            await message.reply(`\n${res.body}`);
        } else {
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            await message.reply(`\nError: ${res.body}`);
        }
    }

}
