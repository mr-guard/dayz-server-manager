import { GuildChannel, Message } from 'discord.js';
import { Manager } from '../control/manager';
import { LogLevel } from '../util/logger';
import { Request, RequestTemplate } from '../types/interface';
import { IService } from '../types/service';
import { LoggerFactory } from '../services/loggerfactory';
import { injectable, singleton } from 'tsyringe';
import { Interface } from './interface';
import { isDiscordChannelType } from '../types/discord';

@singleton()
@injectable()
export class DiscordMessageHandler extends IService {

    public readonly PREFIX = '!';

    public constructor(
        loggerFactory: LoggerFactory,
        private manager: Manager,
        private eventInterface: Interface,
    ) {
        super(loggerFactory.createLogger('DiscordMsgHandler'));
    }

    private formatCommandUsage(command: string, template: RequestTemplate): string {
        return this.PREFIX + command
        + ' '
        + template.params
            .map((param) => param.optional ? `[${param.name}]` : `<${param.name}>`)
            .join(' ')
    }

    public async handleCommandMessage(message: Message): Promise<void> {
        if (!this.manager.initDone) {
            this.log.log(LogLevel.DEBUG, `Received command before init was completed`);
            return;
        }

        const args = message.content.slice(this.PREFIX.length).trim().split(/ +/);
        const command = args.shift()?.toLowerCase();

        if (!command) {
            return;
        }

        const channelName = (message.channel as GuildChannel).name;
        const authorId = message.author.id;
        const authorUserName = message.author.username;

        this.log.log(LogLevel.INFO, `Command "${command}" from "${authorUserName}" (${authorId}) in "${channelName}" with args: "${args?.join(' ')}"`);

        const configChannel = this.manager.config.discordChannels.find((x) => x.channel.toLowerCase() === channelName?.toLowerCase());
        if (command === 'help') {
            let response = 'The following commands are available: \n\n';
            response += [...this.eventInterface.commandMap.entries()]
                .filter((x) => !x[1].disableDiscord)
                .map((x) => this.formatCommandUsage(...x))
                .join('\n\n');
            response += '\n\n ([x] means x is optional, <x> means x is required)';
            await message.reply(response);
            return;
        }

        const handler = this.eventInterface.commandMap?.get(command);
        if (!handler || handler.disableDiscord) {
            await message.reply('Command not found.');
            return;
        }

        if (!isDiscordChannelType(configChannel?.mode || [], 'admin') && !handler.discordPublic) {
            await message.reply('This command is not allowed in this channel.');
            return;
        }

        const req = new Request();
        req.accept = 'text/plain';
        req.resource = command;
        req.user = authorUserName;
        req.body = {};
        req.query = {};
        req.canStream = true;

        const templateParams = (handler.params || []);
        for (let i = 0; i < templateParams.length; i++) {
            if (i >= args.length) {
                await message.reply(`Wrong param count. Usage: ${this.formatCommandUsage(command, handler)}`);
                return;
            }
            try {
                const val = templateParams[i].parse ? templateParams[i].parse(args[i]) : args[i];
                req[templateParams[i].location || 'body'][templateParams[i].name] = val;
            } catch {
                await message.reply(`Could not parse param: '${templateParams[i].name}'. Usage: ${this.formatCommandUsage(command, handler)}`);
                return;
            }
        }

        const res = await this.eventInterface.execute(
            req,
            /* istanbul ignore next */ (part) => message.reply(`\n${part.body}`),
        );

        if (res.status >= 200 && res.status < 300) {
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            await message.reply(`\n${res.body}`);
        } else {
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            await message.reply(`\nError: ${res.body}`);
        }
    }

}
