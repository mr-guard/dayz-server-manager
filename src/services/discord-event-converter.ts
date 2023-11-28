/* istanbul ignore file */
/* Not unit testing this class because it is purely integration */

import { injectable, singleton } from "tsyringe";
import { IService } from "../types/service";
import { LoggerFactory } from "./loggerfactory";
import { Manager } from "../control/manager";
import { EventBus } from "../control/event-bus";
import { InternalEventTypes } from "../types/events";
import { SteamMetaData } from "./steamcmd";
import { MessageEmbed } from "discord.js";
import { GameUpdatedStatus, ModUpdatedStatus } from "../types/steamcmd";
import { ServerState } from "../types/monitor";
import { LogLevel } from "../util/logger";

@singleton()
@injectable()
export class DiscordEventConverter extends IService {

    public constructor(
        loggerFactory: LoggerFactory,
        private manager: Manager,
        private steamMetaData: SteamMetaData,
        private eventBus: EventBus,
    ) {
        super(loggerFactory.createLogger('Discord'));

        this.eventBus.on(
            InternalEventTypes.MOD_UPDATED,
            /* istanbul ignore next */ (e) => this.handleModUpdated(e),
        );

        this.eventBus.on(
            InternalEventTypes.GAME_UPDATED,
            /* istanbul ignore next */ (e) => this.handleGameUpdated(e),
        );

        this.eventBus.on(
            InternalEventTypes.MONITOR_STATE_CHANGE,
            /* istanbul ignore next */ (s1, s2) => this.handleServerState(s1, s2),
        )
    }

    private async handleGameUpdated(status: GameUpdatedStatus): Promise<void> {

        this.log.log(LogLevel.DEBUG, 'Received GameUpdatedStatus', status);

        if (!status.success) {
            this.eventBus.emit(
                InternalEventTypes.DISCORD_MESSAGE,
                {
                    type: 'admin',
                    message: 'Failed to update server!',
                },
            );
        } else {
            this.eventBus.emit(
                InternalEventTypes.DISCORD_MESSAGE,
                {
                    type: 'notification',
                    message: 'Successfully updated server!',
                },
            );
        }
    }

    private async handleModUpdated(status: ModUpdatedStatus): Promise<void> {

        this.log.log(LogLevel.DEBUG, 'Received ModUpdatedStatus', status);

        if (!status.success) {
            this.eventBus.emit(
                InternalEventTypes.DISCORD_MESSAGE,
                {
                    type: 'admin',
                    message: `Failed to update mods: ${status.modIds.join('\n')}`,
                },
            );
            return;
        }

        const modInfos = await this.steamMetaData.getModsMetaData(status.modIds);
        this.eventBus.emit(
            InternalEventTypes.DISCORD_MESSAGE,
            {
                type: 'notification',
                message: '',
                embeds: status.modIds
                    .map((modId) => {
                        return modInfos.find((modInfo) => modInfo?.publishedfileid === modId) || modId;
                    })
                    .map((modInfo) => {
                        const fields = [];
                        if (typeof modInfo !== 'string' && modInfo?.title) {
                            if (modInfo.time_updated || modInfo.time_created) {
                                fields.push({
                                    name: 'Uploaded at',
                                    value: (new Date((modInfo.time_updated || modInfo.time_created) * 1000))
                                        .toISOString()
                                        .split(/[T\.]/)
                                        .slice(0, 2)
                                        .join(' ')
                                        + ' UTC',
                                    inline: true,
                                });
                            }
                            const embed = new MessageEmbed({
                                color: 0x0099FF,
                                title: `Successfully updated: ${modInfo.title}`,
                                url: `https://steamcommunity.com/sharedfiles/filedetails/?id=${modInfo.publishedfileid}`,
                                fields,
                                thumbnail: { url: modInfo.preview_url || undefined },
                                image: { url: modInfo.preview_url || undefined },
                                footer: {
                                    text: 'Powered by DayZ Server Manager',
                                },
                            });
                            return embed;
                        } else if (typeof modInfo === 'string') {
                            return new MessageEmbed({
                                color: 0x0099FF,
                                title: `Successfully updated: ${modInfo}`,
                                url: `https://steamcommunity.com/sharedfiles/filedetails/?id=${modInfo}`,
                                footer: {
                                    text: 'Powered by DayZ Server Manager',
                                },
                            });
                        }
                        return null;
                    })
                    .filter((x) => !!x),
            },
        );
    }

    private async handleServerState(newState: ServerState, previousState: ServerState): Promise<void> {
        // msg about server startup
        if (
            newState === ServerState.STARTED
            && (
                previousState === ServerState.STARTING
            )
        ) {
            const message = 'Server started sucessfully';
            this.log.log(LogLevel.IMPORTANT, message);
            this.eventBus.emit(
                InternalEventTypes.DISCORD_MESSAGE,
                {
                    type: 'notification',
                    message,
                },
            );
        }

        // msg about server stop
        if (
            newState === ServerState.STOPPED
            && (
                previousState === ServerState.STOPPING
            )
        ) {
            const message = 'Server stopped sucessfully';
            this.log.log(LogLevel.IMPORTANT, message);
            this.eventBus.emit(
                InternalEventTypes.DISCORD_MESSAGE,
                {
                    type: 'notification',
                    message,
                },
            );
        }

        // handle stop after running
        if (
            newState === ServerState.STOPPED
            && (
                previousState === ServerState.STARTING
                || previousState === ServerState.STARTED
            )
        ) {
            const message = 'Detected possible server crash. Restarting...';
            this.log.log(LogLevel.WARN, message);
            this.eventBus.emit(
                InternalEventTypes.DISCORD_MESSAGE,
                {
                    type: 'notification',
                    message,
                },
            );
        }
    }

}