import 'reflect-metadata';

/* eslint-disable @typescript-eslint/naming-convention */
// eslint-disable-next-line no-shadow
export enum UserLevelEnum {
    admin = 'admin',
    manage = 'manage',
    moderate = 'moderate',
    view = 'view',
}

export type UserLevel = keyof typeof UserLevelEnum;

// eslint-disable-next-line no-shadow
export enum EventTypeEnum {
    restart = 'restart',
    message = 'message',
    kickAll = 'kickAll',
    lock = 'lock',
    unlock = 'unlock',
    backup = 'backup'
}

export type EventType = keyof typeof EventTypeEnum;
/* eslint-enable @typescript-eslint/naming-convention */

export class Event {

    /**
     * Name of the event
     * @required
     */
    public name!: string;

    /**
     * Type of the event
     * Can be one of:
     * 'restart' - restarts the server
     * 'message' - sends a global messages to all players
     * 'kickAll' - kicks all players
     * 'lock' - locks the server (probably not working)
     * 'unlock' - unlocks the server (probably not working)
     *
     * @required
     */
    public type!: EventType;

    /**
     * The cron format of when to execute this action
     * @required
     */
    public cron!: string;

    /**
     * optional params, e.g. the message
     */
    public params?: string[] | null;

}

/* eslint-disable @typescript-eslint/naming-convention */
// eslint-disable-next-line no-shadow
export enum HookTypeEnum {
    beforeStart = 'beforeStart',
}

export type HookType = keyof typeof HookTypeEnum;
/* eslint-enable @typescript-eslint/naming-convention */


export class Hook {

    /**
     * Type of the Hook
     * Can be one of:
     * 'beforeStart' - restarts the server
     *
     * @required
     */
    public type!: HookType;

    /**
     * The program/script to call
     * @required
     */
    public program!: string;

    /**
     * optional params for the program
     */
    public params?: string[] | null;

}

export class Config {

    /**
     * The instance name of this server
     * @required
     */
    @Reflect.metadata('config-required', true)
    public instanceId: string = 'dayz';

    /**
     * Manager log level
     */
    public loglevel: number = 1;

    // /////////////////////////// Admins /////////////////////////////////////
    /**
     * The web or discord users allowed to use the web interface or the bot commands and which of them
     *
     * level can be one of:
     *  admin - guess what? ... everything
     *  manage - able to perform management tasks such as restarts and updates (and everything below)
     *  moderate - able to perform moderation tasks such as server messages, kicks and bans (and everything below)
     *  view - able to query the server status and ingame situation (ie. player list, objects, etc)
     *
     * if the id does not contain a '#', the user is exclusive to webview
     * the password is only used for the web interface and API
     *
     * example:
     * {
     *     "userId": "Senfo#5128",
     *     "password": "admin",
     *     "userLevel": "admin"
     * }
     *
     * @required
     */
    @Reflect.metadata('config-required', true)
    public admins: {
        userId: string;
        userLevel: UserLevel;
        password: string;
    }[] = [
        {
            userId: 'admin',
            userLevel: 'admin',
            password: 'admin',
        },
    ];

    // /////////////////////////// WEB ////////////////////////////////////////
    /**
     * The port of the web interface and REST API
     *
     * if -1 or 0 it will be serverport + 11
     */
    @Reflect.metadata('config-range', [-1, 65535])
    public webPort: number = 0;

    // /////////////////////////// Discord ////////////////////////////////////

    /**
     * Bot Token for Discord
     * Leave it empty to disable the bot
     */
    public discordBotToken: string = '';

    /**
     * Channels the discord commands will work in
     * by default (if the channel is not listed), only public discord commands are allowed
     *
     * Modes:
     * 'admin' - admin commands are allowed in this channel
     * 'rcon' - rcon relay (rcon messages will be posted there)
     */
    public discordChannels: {
        channel: string;
        mode:
        'admin' // admin commands are allowed in this channel
        | 'rcon' // rcon relay
        ;
    }[] = [];

    // /////////////////////////// DayZ ///////////////////////////////////////

    /**
     * Use the experimental server or not
     * Default is false
     */
    public experimentalServer: boolean = false;

    /**
     * Path to server
     * Default is current directory (PWD / CWD) + DayZServer
     */
    public serverPath: string = 'DayZServer';

    /**
     * Name of the server exe (Default is DayZServer_x64.exe)
     */
    public serverExe: string = 'DayZServer_x64.exe';

    /**
     * Servers Game Port
     */
    @Reflect.metadata('config-range', [-1, 65535])
    public serverPort: number = 2302;

    /**
     * Path to server cfg
     */
    public serverCfgPath: string = 'serverDZ.cfg';

    /**
     * Path to profiles
     */
    public profilesPath: string = 'profiles';

    /**
     * Path to battleye
     * Only set this if you know what your are doing
     */
    public battleyePath: string = '';

    /**
     * RCon Credentials
     * @required
     */
    @Reflect.metadata('config-required', true)
    public rconPassword: string = 'rcon';

    /**
     * Local mods
     * Actual modnames like '@MyAwesomeMod'
     */
    public localMods: string[] = [];

    /**
     * Server mods
     * Actual modnames like '@MyAwesomeMod'
     */
    public serverMods: string [] = [];

    /**
     * Server Startup Param doLogs
     */
    public doLogs: boolean = true;

    /**
     * Server Startup Param adminLog
     */
    public adminLog: boolean = true;

    /**
     * Server Startup Param netLog
     */
    public netLog: boolean = false;

    /**
     * Server Startup Param freezeCheck
     */
    public freezeCheck: boolean = true;

    /**
     * Server Startup Param filePatching
     */
    public filePatching: boolean = false;

    /**
     * Server Startup Param scriptDebug
     */
    public scriptDebug: boolean = true;

    /**
     * Server Startup Param scrAllowFileWrite
     */
    public scrAllowFileWrite: boolean = true;

    /**
     * Server Startup Param limitFps
     */
    public limitFPS: number = -1;

    /**
     * Server Startup Param cpuCount
     */
    public cpuCount: number = -1;

    /**
     * Time (in ms) between each server check
     */
    public serverProcessPollIntervall: number = 30000;

    // /////////////////////////// Backups ////////////////////////////////////////
    /**
     * Path where backups are stored
     * Default is current directory (PWD / CWD) + backups
     *
     * To schedule backups, use the the event scheduler and the event type 'backup'
     *
     * To restore backups:
     * - delete the mpmissions folder in the server folder
     * - go to the backup folder
     * - copy the mpmissions_{date} you want to restore into the server folder
     * - rename the copied folder back to mpmissions
     */
    public backupPath: string = 'backups';

    /**
     * Max age of backups in days
     * Default is one week
     */
    public backupMaxAge: number = 7;

    // /////////////////////////// Steam ////////////////////////////////////////
    /**
     * Path to steam CMD
     * Default is current directory (PWD / CWD) + SteamCMD
     */
    public steamCmdPath: string = 'SteamCMD';

    /**
     * Username for steam CMD
     * @required
     */
    @Reflect.metadata('config-required', true)
    public steamUsername: string = '';

    /**
     * Optional if password is cached (manually logged in once)
     */
    public steamPassword: string = '';

    /**
     * Path to where the downloaded mods are located (relative or absolute)
     * Default is current directory (PWD / CWD) + Workshop
     *
     * Note: this is the folder that containes: steamapps/workshop/content/221100
     *
     * Note2: we want this to be a folder outside the steamcmd folder
     *  so we can delete the steamcmd folder in case of errors
     */
    public steamWorkshopPath: string = 'Workshop';

    /**
     * List of Mod IDs (workshop id, not modname!) the server should use
     */
    public steamWsMods: string[] = [];

    /**
     * Whether or not to check for mod updates on each server restart
     */
    public updateModsBeforeServerStart: boolean = true;

    /**
     * Whether or not to check for mod updates when the manager is started
     */
    public updateModsOnStartup: boolean = true;

    /**
     * Whether or not to check for server updates on each server restart
     */
    public updateServerBeforeServerStart: boolean = true;

    /**
     * Whether or not to check for mod updates when the manager is started
     */
    public updateServerOnStartup: boolean = true;

    /**
     * Whether or not to use hardlink for mods instead of copying them
     */
    public linkModDirs: boolean = false;

    // /////////////////////////// Events ///////////////////////////////////////

    /**
     * Events are actions which can be scheduled to run at a given point in time or frequently
     *
     * Events are defined by:
     * name - string - name of the event
     * cron - string - the cron format of when to execute this action
     * params - string[] - optional params, e.g. the message
    *
    * Types:
     * 'restart' - restarts the server
     * 'message' - sends a global messages to all players
     * 'kickAll' - kicks all players
     * 'lock' - locks the server (probably not working)
     * 'unlock' - unlocks the server (probably not working)
     * 'backup' - creates backup of mpmissions folder
     *
     *
     * CRON - Format:
     * ┌────────────── second (optional)
     * │ ┌──────────── minute
     * │ │ ┌────────── hour
     * │ │ │ ┌──────── day of month
     * │ │ │ │ ┌────── month
     * │ │ │ │ │ ┌──── day of week
     * │ │ │ │ │ │
     * │ │ │ │ │ │
     * * * * * * *
     *
     * Examples:
     *
     * List:
     * '1,4,5 * * * *' - executes every first, fourth and fifth minute (i.e.: ... 15:05, 16:01, 16:04, 16:05, 17:01, 17:04, 17:05 ...)
     * Range:
     * '1-5 * * * *' - executes every 1,2,3,4,5 minute (i.e.: ... 15:05, 16:01, 16:02, 16:03, 16:04, 16:05, 17:01...)
     * Multiples:
     * '0/2 * * * *' - executes every two minutes (i.e.: ... 16:02, 16:04, 16:06, 16:08 ...)
     * Combinations:
     * '1-6/2 * * * *' - executes every two minutes in 1-10 range (i.e.: ... 15:06, 16:02, 16:04, 16:06, 17:02 ...)
     *
     * You can generate and test cron formats with:
     * https://crontab.guru/
     * https://www.freeformatter.com/cron-expression-generator-quartz.html
     * https://cronjob.xyz/
     */
    public events: Event[] = [];

    /**
     * Time (in ms) between each metric tick (read players, system status, etc.)
     */
    public metricPollIntervall: number = 10000;

    /**
     * Time (in ms) after which metrics will be removed (tick by tick)
     * Default is 30 days
     */
    public metricMaxAge: number = 2_592_000;

    // /////////////////////////// Hooks ///////////////////////////////////////
    public hooks: Hook[] = [];

}
