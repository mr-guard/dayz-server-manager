import { injectable, singleton } from 'tsyringe';
import { UserLevel } from '../config/config';
import { Manager } from '../control/manager';
import { Backups } from '../services/backups';
import { LogReader } from '../services/log-reader';
import { LoggerFactory } from '../services/loggerfactory';
import { Metrics } from '../services/metrics';
import { MissionFiles } from '../services/mission-files';
import { Monitor, ServerDetector, SystemReporter } from '../services/monitor';
import { RCON } from '../services/rcon';
import { SteamCMD } from '../services/steamcmd';
import { Request, Response } from '../types/interface';
import { IService } from '../types/service';
import { LogLevel } from '../util/logger';
import { merge } from '../util/merge';
import { makeTable } from '../util/table';
import { constants as HTTP } from 'http2';
import { ConfigFileHelper } from '../config/config-file-helper';

export type RequestHandler = (request: Request) => Promise<Response>;
export type RequestMethods = 'get' | 'post' | 'put' | 'delete';

export class RequestTemplate {

    /* istanbul ignore next */
    public action: RequestHandler = async (r) => {
        return {
            status: HTTP.HTTP_STATUS_GONE,
            body: `Unknown Resource: ${r?.resource}`,
        };
    };

    public level: UserLevel = 'admin';
    public method: RequestMethods = 'get';
    public params: string[] = [];
    public paramsOptional?: boolean = false;

    public disableDiscord?: boolean = false;
    public discordPublic?: boolean = false;
    public disableRest?: boolean = false;

    public static build(optionals: {
        [Property in keyof RequestTemplate]?: RequestTemplate[Property];
    }): RequestTemplate {
        return merge(new RequestTemplate(), optionals);
    }

}

@singleton()
@injectable()
/* istanbul ignore next */
export class InterfaceDispatcher extends IService {

    private handler: (req: Request) => Promise<Response>;

    private commandHandler: () => Map<string, RequestTemplate>;

    public registerHandler(handler: (req: Request) => Promise<Response>): void {
        this.handler = handler;
    }

    public registerCommandHandler(handler: () => Map<string, RequestTemplate>): void {
        this.commandHandler = handler;
    }

    /* istanbul ignore next */
    public async execute(req: Request): Promise<Response> {
        if (!this.handler) {
            return new Response(
                HTTP.HTTP_STATUS_SERVICE_UNAVAILABLE,
                'Handler not yet registered',
            );
        }
        return this.handler(req);
    }

    /* istanbul ignore next */
    public getCommands(): Map<string, RequestTemplate> {
        if (!this.commandHandler) {
            return null;
        }
        return this.commandHandler();
    }

}

@singleton()
@injectable()
export class Interface extends IService {

    public commandMap!: Map<string, RequestTemplate>;

    public constructor( // NOSONAR
        loggerFactory: LoggerFactory,
        private dispatcher: InterfaceDispatcher,
        private manager: Manager,
        private rcon: RCON,
        private monitor: Monitor,
        private systemReporter: SystemReporter,
        private serverDetector: ServerDetector,
        private metrics: Metrics,
        private steamCmd: SteamCMD,
        private logReader: LogReader,
        private backup: Backups,
        private missionFiles: MissionFiles,
        private configFileHelper: ConfigFileHelper,
    ) {
        super(loggerFactory.createLogger('Manager'));
        this.dispatcher.registerHandler(/* istanbul ignore next */ (req) => this.execute(req));
        this.dispatcher.registerCommandHandler(/* istanbul ignore next */ () => this.commandMap);
        this.setupCommandMap();
    }

    private singleParamWrapper(
        param: string,
        fnc: (p: any) => Promise<any>,
        result?: boolean,
        optional?: boolean,
    ): (r: Request) => Promise<Response> {
        return async (req: Request) => {
            const paramVal = req.body ? req.body[param] : null;
            if (!optional && !paramVal) {
                return new Response(HTTP.HTTP_STATUS_BAD_REQUEST, `Missing param ${param}`);
            }
            if (result) {
                return this.executeWithResult(
                    req,
                    () => fnc(paramVal),
                );
            }
            return this.executeWithoutResult(
                req,
                () => fnc(paramVal),
            );
        };
    }

    private setupCommandMap(): void {

        this.commandMap = new Map([
            ['ping', RequestTemplate.build({
                level: 'view',
                disableRest: true,
                action: (req) => this.executeWithResult(
                    req,
                    async () => 'I won\'t say pong you stupid fuck',
                ),
            })],
            ['process', RequestTemplate.build({
                level: 'view',
                action: (req) => this.executeWithResult(
                    req,
                    this.getDayZProcesses,
                ),
            })],
            ['system', RequestTemplate.build({
                level: 'view',
                action: (req) => this.executeWithResult(
                    req,
                    this.getSystemReport,
                ),
            })],
            ['players', RequestTemplate.build({
                level: 'view',
                action: (req) => this.executeWithResult(
                    req,
                    this.getPlayers,
                ),
            })],
            ['bans', RequestTemplate.build({
                level: 'view',
                action: (req) => this.executeWithResult(
                    req,
                    this.getBans,
                ),
            })],
            ['lock', RequestTemplate.build({
                method: 'post',
                level: 'moderate',
                action: (req) => this.executeWithoutResult(
                    req,
                    () => this.rcon.lock(),
                ),
            })],
            ['unlock', RequestTemplate.build({
                method: 'post',
                level: 'moderate',
                action: (req) => this.executeWithoutResult(
                    req,
                    () => this.rcon.unlock(),
                ),
            })],
            ['global', RequestTemplate.build({
                method: 'post',
                level: 'moderate',
                params: ['message'],
                action: this.singleParamWrapper(
                    'message',
                    (message) => this.rcon.global(message),
                ),
            })],
            ['kickall', RequestTemplate.build({
                method: 'post',
                level: 'moderate',
                action: (req) => this.executeWithoutResult(
                    req,
                    () => this.rcon.kickAll(),
                ),
            })],
            ['kick', RequestTemplate.build({
                method: 'post',
                level: 'moderate',
                params: ['player'],
                action: this.singleParamWrapper(
                    'player',
                    (player) => this.rcon.kick(player),
                ),
            })],
            ['ban', RequestTemplate.build({
                method: 'post',
                level: 'moderate',
                params: ['player'],
                action: this.singleParamWrapper(
                    'player',
                    (player) => this.rcon.ban(player),
                ),
            })],
            ['removeban', RequestTemplate.build({
                method: 'post',
                level: 'moderate',
                params: ['player'],
                action: this.singleParamWrapper(
                    'player',
                    (player) => this.rcon.removeBan(player),
                ),
            })],
            ['reloadbans', RequestTemplate.build({
                method: 'post',
                level: 'moderate',
                action: (req) => this.executeWithoutResult(
                    req,
                    () => this.rcon.reloadBans(),
                ),
            })],
            ['restart', RequestTemplate.build({
                method: 'post',
                level: 'manage',
                params: ['force'],
                paramsOptional: true,
                action: this.singleParamWrapper(
                    'force',
                    (force) => this.monitor.killServer(!!force && force !== 'false'),
                    false,
                    true,
                ),
            })],
            ['isrestartlocked', RequestTemplate.build({
                method: 'get',
                level: 'view',
                action: (req) => this.executeWithResult(
                    req,
                    async () => {
                        return this.monitor.restartLock;
                    },
                ),
            })],
            ['lockrestart', RequestTemplate.build({
                method: 'post',
                level: 'manage',
                action: (req) => this.executeWithoutResult(
                    req,
                    async () => {
                        this.monitor.restartLock = true;
                    },
                ),
            })],
            ['unlockrestart', RequestTemplate.build({
                method: 'post',
                level: 'manage',
                action: (req) => this.executeWithoutResult(
                    req,
                    async () => {
                        this.monitor.restartLock = false;
                    },
                ),
            })],
            ['metrics', RequestTemplate.build({
                method: 'get',
                level: 'manage',
                disableDiscord: true,
                params: ['type', 'since'],
                action: async (req: Request) => {
                    if (!req.query?.type) {
                        return new Response(HTTP.HTTP_STATUS_BAD_REQUEST, `Missing param type`);
                    }
                    return this.executeWithResult(
                        req,
                        () => {
                            const ts = req.query?.since ? Number(req.query.since) : undefined;
                            return this.metrics.fetchMetrics(
                                req.query.type,
                                ts,
                            );
                        },
                    );
                },
            })],
            ['deleteMetrics', RequestTemplate.build({
                method: 'delete',
                level: 'admin',
                disableDiscord: true,
                params: ['maxAgeDays'],
                action: this.singleParamWrapper(
                    'maxAgeDays',
                    async (maxAgeDays) => {
                        const days = Number(maxAgeDays);
                        if (days > 0) {
                            this.metrics.deleteMetrics(days * 24 * 60 * 60 * 1000);
                        }
                    },
                    false,
                    false,
                ),
            })],
            ['logs', RequestTemplate.build({
                method: 'get',
                level: 'manage',
                disableDiscord: true,
                params: ['type', 'since'],
                action: async (req: Request) => {
                    if (!req.query?.type) {
                        return new Response(HTTP.HTTP_STATUS_BAD_REQUEST, `Missing param type`);
                    }
                    return this.executeWithResult(
                        req,
                        () => this.logReader.fetchLogs(req.query.type, req.query.since ? Number(req.query.since) : undefined),
                    );
                },
            })],
            ['login', RequestTemplate.build({
                method: 'post',
                level: 'view',
                disableDiscord: true,
                action: (req) => this.executeWithResult(
                    req,
                    async () => {
                        const userLevel = this.manager.getUserLevel(req.user);
                        if (userLevel) {
                            this.log.log(LogLevel.IMPORTANT, `User ${req.user} logged in`);
                        }
                        return userLevel;
                    },
                ),
            })],
            ['config', RequestTemplate.build({
                method: 'get',
                level: 'admin',
                disableDiscord: true,
                action: (req) => this.executeWithResult(
                    req,
                    () => Promise.resolve(this.manager.config),
                ),
            })],
            ['updateconfig', RequestTemplate.build({
                method: 'post',
                level: 'admin',
                disableDiscord: true,
                params: ['config'],
                action: this.singleParamWrapper(
                    'config',
                    async (config) => {

                        try {
                            this.configFileHelper.writeConfig(config);
                            return true;
                        } catch (e) {
                            throw new Response(HTTP.HTTP_STATUS_BAD_REQUEST, e);
                        }

                    },
                    true,
                    true,
                ),
            })],
            ['updatemods', RequestTemplate.build({
                method: 'post',
                level: 'manage',
                disableDiscord: true,
                action: (req) => this.executeWithResult(
                    req,
                    () => {
                        return this.steamCmd.updateMods();
                    },
                ),
            })],
            ['updateserver', RequestTemplate.build({
                method: 'post',
                level: 'manage',
                disableDiscord: true,
                action: (req) => this.executeWithResult(
                    req,
                    () => {
                        return this.steamCmd.updateServer();
                    },
                ),
            })],
            ['backup', RequestTemplate.build({
                method: 'post',
                level: 'manage',
                action: (req) => this.executeWithoutResult(
                    req,
                    () => this.backup.createBackup(),
                ),
            })],
            ['getbackups', RequestTemplate.build({
                method: 'get',
                level: 'manage',
                action: (req) => this.executeWithResult(
                    req,
                    () => this.backup.getBackups(),
                ),
            })],
            ['writemissionfile', RequestTemplate.build({
                method: 'post',
                level: 'manage',
                disableDiscord: true,
                params: ['file', 'content', 'createBackup'],
                action: (req) => this.executeWithoutResult(
                    req,
                    () => this.missionFiles.writeMissionFile(
                        req.body?.file,
                        req.body?.content,
                        req.body?.createBackup,
                    ),
                ),
            })],
            ['readmissionfile', RequestTemplate.build({
                method: 'get',
                level: 'manage',
                disableDiscord: true,
                params: ['file'],
                action: async (req: Request) => {
                    if (!req.query?.file) {
                        return new Response(HTTP.HTTP_STATUS_BAD_REQUEST, `Missing param 'file'`);
                    }
                    return this.executeWithResult(
                        req,
                        () => this.missionFiles.readMissionFile(req.query.file),
                    );
                },
            })],
            ['readmissiondir', RequestTemplate.build({
                method: 'get',
                level: 'manage',
                disableDiscord: true,
                action: async (req: Request) => {
                    if (!req.query?.dir) {
                        return new Response(HTTP.HTTP_STATUS_BAD_REQUEST, `Missing param 'dir'`);
                    }
                    return this.executeWithResult(
                        req,
                        () => this.missionFiles.readMissionDir(req.query.dir),
                    );
                },
            })],
            ['serverinfo', RequestTemplate.build({
                method: 'get',
                level: 'view',
                disableDiscord: true,
                action: (req) => this.executeWithResult(
                    req,
                    () => this.manager.getServerInfo(),
                ),
            })],
        ]);
    }

    private handleExecutionError(req: Request, error: any): Response {
        const errorMsg = `Error executing interface action: ${req.resource}`;
        this.log.log(LogLevel.ERROR, errorMsg, error);
        if (error instanceof Response) {
            return error;
        }
        return new Response(
            HTTP.HTTP_STATUS_INTERNAL_SERVER_ERROR,
            errorMsg,
        );
    }

    private async executeWithoutResult(req: Request, fnc: (request: Request) => Promise<any>): Promise<Response> {
        try {
            await fnc(req);
            return new Response(
                HTTP.HTTP_STATUS_OK,
                'Done',
            );
        } catch (e) {
            return this.handleExecutionError(req, e);
        }
    }

    private async executeWithResult(req: Request, fnc: (request: Request) => Promise<any>): Promise<Response> {
        try {
            const result = await fnc(req);
            if (!result) {
                return new Response(HTTP.HTTP_STATUS_NOT_FOUND, 'Action had no results');
            }
            return new Response(HTTP.HTTP_STATUS_OK, result);
        } catch (e) {
            return this.handleExecutionError(req, e);
        }
    }

    private acceptsText(req: Request): boolean {
        return !!req?.accept?.startsWith('text');
    }

    private getDayZProcesses = async (req: Request): Promise<any> => {
        const result = await this.serverDetector.getDayZProcesses();
        if (!result?.length) {
            throw new Response(
                HTTP.HTTP_STATUS_NOT_FOUND,
                'Could not find any processes ¯\\_(ツ)_/¯',
            );
        }
        if (this.acceptsText(req)) {
            return makeTable([
                ['Name', 'PID', 'Created', 'Path'],
                ...result.map((x) => [
                    x.Name,
                    x.ProcessId,
                    x.CreationDate,
                    x.ExecutablePath,
                ]),
            ]).join('\n');
        }
        return result;
    };

    private getSystemReport = async (req: Request): Promise<any> => {
        const result = await this.systemReporter.getSystemReport();
        if (!result) {
            throw new Response(HTTP.HTTP_STATUS_NOT_FOUND, 'Could not determine system state');
        }
        return this.acceptsText(req) ? result.format() : result;
    };

    private getPlayers = async (req: Request): Promise<any> => {
        if (this.acceptsText(req)) {
            return this.rcon.getPlayersRaw();
        }
        return this.rcon.getPlayers();
    };

    private getBans = async (req: Request): Promise<any> => {
        if (this.acceptsText(req)) {
            return this.rcon.getBansRaw();
        }
        return this.rcon.getBans();
    };

    // apply RBAC and audit
    private async actionRbacCheck(req: Request): Promise<Response | null> {
        const x = this.commandMap.get(req.resource);
        if (x.level) {
            const user = this.manager.config?.admins?.find((admin) => admin.userId === req.user);
            if (
                !user
                || !req.user
                || !this.manager.isUserOfLevel(req.user, x.level)
            ) {
                return new Response(
                    HTTP.HTTP_STATUS_UNAUTHORIZED,
                    'You are not allowed to do that',
                );
            }

            if (req.resource && x.method !== 'get') {
                void this.metrics.pushMetricValue(
                    'AUDIT',
                    {
                        timestamp: new Date().valueOf(),
                        user: user.userId,
                        value: req,
                    },
                );

                if (req.resource !== 'global') {
                    this.log.log(
                        LogLevel.IMPORTANT,
                        `User '${req.user}' executed: ${req.resource}`,
                    );
                }
            }
        }
    }

    // apply Init Lock
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private async actionInitCheck(req: Request): Promise<Response | null> {
        if (!this.manager.initDone) {
            return new Response(
                HTTP.HTTP_STATUS_LOCKED,
                'The ServerManager is currently starting...',
            );
        }
        return null;
    }

    public async execute(req: Request): Promise<Response> {
        if (!req.resource || !this.commandMap.has(req.resource)) {
            return new Response(
                HTTP.HTTP_STATUS_BAD_REQUEST,
                'Unkown action',
            );
        }

        const interceptors: ((r: Request) => Promise<Response | null>)[] = [
            (r) => this.actionInitCheck(r),
            (r) => this.actionRbacCheck(r),
        ];

        for (const interceptor of interceptors) {
            const resp = await interceptor(req);
            if (resp) {
                return resp;
            }
        }

        return this.commandMap.get(req.resource).action(req);
    }

}
