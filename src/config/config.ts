import 'reflect-metadata';

/* eslint-disable @typescript-eslint/naming-convention */

export class ServerCfg {

    // General

    /**
     * Server name
     *
     * @required
     */
    @Reflect.metadata('config-required', true)
    public hostname: string = 'EXAMPLE NAME';

    /**
     * Maximum amount of players
     *
     * @required
     */
    @Reflect.metadata('config-required', true)
    public maxPlayers: number = 60;

    /**
     * Message of the day displayed in the in-game chat
     */
    public motd: string[] = [];

    /**
     * Time interval (in seconds) between each message
     */
    public motdInterval: number = 1;


    // Security

    /**
     * Password to connect to the server
     */
    public password: string = '';

    /**
     * Password to become a server admin
     */
    public passwordAdmin: string = '';

    /**
     * Enable/disable whitelist (value 0-1)
     */
    @Reflect.metadata('config-range', [0, 1])
    public enableWhitelist: 0 | 1 = 0;

    /**
     * Use BattlEye
     */
    @Reflect.metadata('config-range', [0, 1])
    public BattlEye: 0 | 1 = 1;

    /**
     * Verifies .pbos against .bisign files. (only 2 is supported)
     *
     * @required
     */
    @Reflect.metadata('config-required', true)
    @Reflect.metadata('config-range', [0, 2])
    public verifySignatures: 0 | 1 | 2 = 2;

    /**
     * When enabled, the server will allow the connection only to clients with same the .exe revision as the server (value 0-1)
     */
    @Reflect.metadata('config-range', [0, 1])
    public forceSameBuild: 0 | 1 = 1;

    /**
     * Communication protocol used with game server (use only number 1)
     */
    @Reflect.metadata('config-range', [1, 1])
    public guaranteedUpdates: 1 = 1;

    /**
     * if set to 1 it will enable connection of clients with "-filePatching" launch parameter enabled
     */
    @Reflect.metadata('config-range', [0, 1])
    public allowFilePatching: 0 | 1 = 0;

    /**
     * defines Steam query port
     * should fix the issue with server not being visible in client server browser
     */
    public steamQueryPort: number = 2305;

    /**
     * Max ping value until server kick the user (value in milliseconds)
     */
    public maxPing: number = 200;

    /**
     * enable speedhack detection, values 1-10 (1 strict, 10 benevolent, can be float)
     */
    @Reflect.metadata('config-range', [1, 10])
    public speedhackDetection: number = 1;

    // VON

    /**
     * Enable/disable voice over network (value 0-1)
     */
    @Reflect.metadata('config-range', [0, 1])
    public disableVoN: 0 | 1 = 0;

    /**
     * Voice over network codec quality, the higher the better (values 0-30)
     */
    @Reflect.metadata('config-range', [0, 30])
    public vonCodecQuality: number = 20;


    // Game

    /**
     * Toggles the 3rd person view for players (value 0-1)
     */
    @Reflect.metadata('config-range', [0, 1])
    public disable3rdPerson: 0 | 1 = 0;

    /**
     * Toggles the cross-hair (value 0-1)
     */
    public disableCrosshair: 0 | 1 = 0;

    /**
     * set to 1 to disable damage/destruction of fence and watchtower
     */
    @Reflect.metadata('config-range', [0, 1])
    public disableBaseDamage: 0 | 1 = 0;

    /**
     * set to 1 to disable damage/destruction of tents, barrels, wooden crate and seachest
     */
    @Reflect.metadata('config-range', [0, 1])
    public disableContainerDamage: 0 | 1 = 0;

    /**
     * set to 1 to disable the respawn dialog (new characters will be spawning as random)
     */
    @Reflect.metadata('config-range', [0, 1])
    public disableRespawnDialog: 0 | 1 = 0;

    /**
     * Sets the respawn delay (in seconds) before the player is able to get a new character on the server, when the previous one is dead
     */
    public respawnTime: number = 5;

    /**
     * shows info about the character using a debug window in a corner of the screen (value 0-1)
     */
    @Reflect.metadata('config-range', [0, 1])
    public enableDebugMonitor: 0 | 1 = 1;


    // Time and weather

    /**
     * Disables personal light for all clients connected to server
     */
    @Reflect.metadata('config-range', [0, 1])
    public disablePersonalLight: 0 | 1 = 1;

    /**
     * 0 for brighter night setup
     * 1 for darker night setup
     */
    @Reflect.metadata('config-range', [0, 1])
    public lightingConfig: 0 | 1 = 0;

    /**
     * Initial in-game time of the server.
     * "SystemTime" means the local time of the machine.
     * Another possibility is to set the time to some value in "YYYY/MM/DD/HH/MM" format, f.e. "2015/4/8/17/23".
     */
    public serverTime: string = 'SystemTime';

    /**
     * Accelerated Time (value 0-24)
     * This is a time multiplier for in-game time.
     * In this case, the time would move 24 times faster than normal, so an entire day would pass in one hour.
     */
    public serverTimeAcceleration: number = 12;

    /**
     * Accelerated Nigh Time - The numerical value being a multiplier (0.1-64) and also multiplied by serverTimeAcceleration value.
     * Thus, in case it is set to 4 and serverTimeAcceleration is set to 2, night time would move 8 times faster than normal.
     * An entire night would pass in 3 hours.
     */
    public serverNightTimeAcceleration: number = 1;

    /**
     * Persistent Time (value 0-1)
     * The actual server time is saved to storage, so when active, the next server start will use the saved time value.
     */
    @Reflect.metadata('config-range', [0, 1])
    public serverTimePersistent: 0 | 1 = 0;


    // Performance

    /**
     * The number of players concurrently processed during the login process.
     * Should prevent massive performance drop during connection when a lot of people are connecting at the same time.
     */
    public loginQueueConcurrentPlayers: number = 5;

    /**
     * The maximum number of players that can wait in login queue
     */
    public loginQueueMaxPlayers: number = 500;

    /**
     * Set limit of how much players can be simulated per frame (for server performance gain)
     */
    public simulatedPlayersBatch: number = 20;

    /**
     * enables multi-threaded processing of server's replication system
     * number of worker threads is derived by settings of jobsystem in dayzSettings.xml by "maxcores" and "reservedcores" parameters (value 0-1)
     */
    @Reflect.metadata('config-range', [0, 1])
    public multithreadedReplication: 0 | 1 = 1;

    /**
     * network bubble distance for spawn of close objects with items in them (f.i. backpacks), set in meters, default value if not set is 20
     */
    public networkRangeClose: number = 20;

    /**
     * network bubble distance for spawn (despawn +10%) of near inventory items objects, set in meters, default value if not set is 150
     */
    public networkRangeNear: number = 150;

    /**
     * network bubble distance for spawn (despawn +10%) of far objects (other than inventory items), set in meters, default value if not set is 1000
     */
    public networkRangeFar: number = 1000;

    /**
     * network bubble distance for spawn of effects (currently only sound effects), set in meters, default value if not set is 4000
     */
    public networkRangeDistantEffect: number = 4000;

    /**
     * highest terrain render distance on server (if higher than "viewDistance=" in DayZ client profile, clientside parameter applies)
     */
    public defaultVisibility: number = 1375;

    /**
     * highest object render distance on server (if higher than "preferredObjectViewDistance=" in DayZ client profile, clientside parameter applies)
     */
    public defaultObjectViewDistance: number = 1375;


    // Persistency

    /**
     * DayZ server instance id, to identify the number of instances per box and their storage folders with persistence files
     *
     * @required
     */
    @Reflect.metadata('config-required', true)
    public instanceId = 1;

    /**
     * Disable houses/doors persistence (value true/false), usable in case of problems with persistence
     */
    public storeHouseStateDisabled: boolean = false;

    /**
     * Checks if the persistence files are corrupted and replaces corrupted ones with empty ones (value 0-1)
     */
    @Reflect.metadata('config-range', [0, 1])
    public storageAutoFix: 0 | 1 = 1;


    // Logs

    /**
     * Format for timestamps in the .rpt file (value Full/Short)
     */
    public timeStampFormat: 'Full' | 'Short' = 'Short';

    /**
     * Logs the average server FPS (value in seconds), needs to have ''-doLogs'' launch parameter active
     */
    public logAverageFps: number = 30;

    /**
     * Logs the server memory usage (value in seconds), needs to have the ''-doLogs'' launch parameter active
     */
    public logMemory: number = 30;

    /**
     * Logs the count of currently connected players (value in seconds), needs to have the ''-doLogs'' launch parameter active
     */
    public logPlayers: number = 30;

    /**
     * Saves the server console log to a file in the folder with the other server logs
     */
    public logFile: string = 'server_console.log';

    /**
     * 1 - log player hits only / 0 - log all hits ( animals/infected )
     */
    @Reflect.metadata('config-range', [0, 1])
    public adminLogPlayerHitsOnly: 0 | 1 = 0;

    /**
     * 1 - log placement action ( traps, tents )
     */
    @Reflect.metadata('config-range', [0, 1])
    public adminLogPlacement: 0 | 1 = 0;

    /**
     * 1 - log basebuilding actions ( build, dismantle, destroy )
     */
    @Reflect.metadata('config-range', [0, 1])
    public adminLogBuildActions: 0 | 1 = 0;

    /**
     * 1 - log periodic player list with position every 5 minutes
     */
    @Reflect.metadata('config-range', [0, 1])
    public adminLogPlayerList: 0 | 1 = 0;


    /**
     * Mission to load on server startup. <MissionName>.<TerrainName>
     * Vanilla mission: dayzOffline.chernarusplus
     * DLC mission: dayzOffline.enoch
     *
     * @required
     */
    @Reflect.metadata('config-required', true)
    public Missions: {
        DayZ: {
            template: string;
        };
    } = {
        DayZ: {
            template: 'dayzOffline.chernarusplus',
        },
    };

}

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

export class WorkshopMod {

    public workshopId!: string;

    public name?: string;

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

    /**
     * Whether or not to publish the WebUI or not
     *
     * if this is enabled, the webserver host is 0.0.0.0 rather than localhost
     * this can be a security risk, so better leave this turned off if you dont know what this means
     * and use a browser on your server to connect to the web ui via localhost
     *
     * if you want to publish the web ui, it is recommended to use a reverse proxy (such as nginx)
     * and secure the connection to the reverse proxy with a SSL Cert for HTTPS
     * (because this app wont provide HTTPS capabilities)
     */
    public publishWebServer: boolean = false;

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
     * Server Startup Params (manual)
     */
    public serverLaunchParams: string[] = [];

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
    public steamWsMods: (string | WorkshopMod)[] = [];

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

    /**
     * Whether to deep compare mods instead of just checking for update timestamps
     */
    public copyModDeepCompare: boolean = false;

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
    /**
     * Hooks to define custom behaviour when certain events happen
     */
    public hooks: Hook[] = [];

    // /////////////////////////// ServerCfg ///////////////////////////////////////
    /**
     * serverCfg
     */
    @Reflect.metadata('config-required', true)
    public serverCfg: ServerCfg = new ServerCfg();

}
