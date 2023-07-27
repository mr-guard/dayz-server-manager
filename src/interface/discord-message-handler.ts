import { GuildChannel, Message } from 'discord.js';
import { Manager } from '../control/manager';
import { LogLevel } from '../util/logger';
import { Request } from '../types/interface';
import { IService } from '../types/service';
import { LoggerFactory } from '../services/loggerfactory';
import { injectable, singleton } from 'tsyringe';
import { EventBus } from '../control/event-bus';
import { InternalEventTypes } from '../types/events';

@singleton()
@injectable()
export class DiscordMessageHandler extends IService {

    public readonly PREFIX = '!';

    public constructor(
        loggerFactory: LoggerFactory,
        private manager: Manager,
        private eventBus: EventBus,
    ) {
        super(loggerFactory.createLogger('DiscordMsgHandler'));
    }

    public async handleCommandMessage(message: Message): Promise<void> {
        if (!this.manager.initDone) {
            this.log.log(LogLevel.DEBUG, `Received command before init was completed`);
            return;
        }

        const args = message.content.slice(this.PREFIX.length).trim().split(/ +/);
        const command = args?.shift()?.toLowerCase();

        if (!command) {
            return;
        }

        const channelName = (message.channel as GuildChannel).name;
        const authorId = message.author.tag;

        if (!authorId?.includes('#')) {
            // safety
            this.log.log(LogLevel.DEBUG, `Received command without valid author id`);
            return;
        }

        this.log.log(LogLevel.INFO, `Command "${command}" from "${authorId}" in "${channelName}" with args: "${args?.join(' ')}"`);

        const configChannel = this.manager.config.discordChannels.find((x) => x.channel.toLowerCase() === channelName?.toLowerCase());
        // if (command === 'help') {
        //     let response = 'The following commands are available: \n\n';
        //     response += [...this.interfaceService.commandMap.entries()]
        //         .filter((x) => !x[1].disableDiscord)
        //         .map((x) => this.PREFIX + x[0]
        //             + x[1].params
        //                 .map((param) => x[1].paramsOptional ? `[${param}]` : `<${param}>`)
        //                 .join(' '))
        //         .join('\n\n');
        //     response += '\n\n ([x] means x is optional, <x> means x is required)';
        //     await message.reply(response);
        //     return;
        // }

        const handler = (await this.eventBus.request(InternalEventTypes.INTERFACE_COMMANDS))?.get(command);
        if (!handler || handler.disableDiscord) {
            await message.reply('Command not found.');
            return;
        }

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

        const res = await this.eventBus.request(InternalEventTypes.INTERFACE_REQUEST, req);

        if (res.status >= 200 && res.status < 300) {
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            await message.reply(`\n${res.body}`);
        } else {
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            await message.reply(`\nError: ${res.body}`);
        }
    }

}
