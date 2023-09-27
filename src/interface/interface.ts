import { injectable, singleton } from 'tsyringe';
import { Manager } from '../control/manager';
import { Backups } from '../services/backups';
import { LogReader } from '../services/log-reader';
import { LoggerFactory } from '../services/loggerfactory';
import { Metrics } from '../services/metrics';
import { MissionFiles } from '../services/mission-files';
import { Monitor } from '../services/monitor';
import { SystemReporter } from '../services/system-reporter';
import { RCON } from '../services/rcon';
import { SteamCMD } from '../services/steamcmd';
import { CommandMap, Request, RequestTemplate, Response, ResponsePartHandler } from '../types/interface';
import { IService } from '../types/service';
import { LogLevel } from '../util/logger';
import { makeTable } from '../util/table';
import { constants as HTTP } from 'http2';
import { ConfigFileHelper } from '../config/config-file-helper';
import { ServerDetector } from '../services/server-detector';

/* istanbul ignore next */
const parseBoolean = (val: any): boolean => true === val || 'true' === val;

/* istanbul ignore next */
const parseNumber = (val: any): number => typeof val === 'number' ? val : Number(val);

@singleton()
@injectable()
export class Interface extends IService {

    public commandMap!: CommandMap;

    public constructor( // NOSONAR
        loggerFactory: LoggerFactory,
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
        this.setupCommandMap();
    }

    private setupCommandMap(): void {

        this.commandMap = new Map([
            ['ping', RequestTemplate.build({
                level: 'view',
                disableRest: true,
                action: () => 'I won\'t say pong you stupid fuck',
            })],
            ['process', RequestTemplate.build({
                level: 'view',
                action: this.getDayZProcesses,
            })],
            ['system', RequestTemplate.build({
                level: 'view',
                action: this.getSystemReport,
            })],
            ['players', RequestTemplate.build({
                level: 'view',
                action: this.getPlayers,
            })],
            ['bans', RequestTemplate.build({
                level: 'view',
                action: this.getBans,
            })],
            ['shutdown', RequestTemplate.build({
                method: 'post',
                level: 'manage',
                noResponse: true,
                action: () => this.rcon.shutdown(),
            })],
            ['lock', RequestTemplate.build({
                method: 'post',
                level: 'moderate',
                noResponse: true,
                action: () => this.rcon.lock(),
            })],
            ['unlock', RequestTemplate.build({
                method: 'post',
                level: 'moderate',
                noResponse: true,
                action: () => this.rcon.unlock(),
            })],
            ['global', RequestTemplate.build({
                method: 'post',
                level: 'moderate',
                params: [{ name: 'message' }],
                noResponse: true,
                action: (req, params) => this.rcon.global(params.message),
            })],
            ['kickall', RequestTemplate.build({
                method: 'post',
                level: 'moderate',
                noResponse: true,
                action: () => this.rcon.kickAll(),
            })],
            ['kick', RequestTemplate.build({
                method: 'post',
                level: 'moderate',
                params: [{ name: 'player' }],
                noResponse: true,
                action: (req, params) => this.rcon.kick(params.player),
            })],
            ['ban', RequestTemplate.build({
                method: 'post',
                level: 'moderate',
                params: [{ name: 'player' }],
                noResponse: true,
                action: (req, params) => this.rcon.ban(params.player),
            })],
            ['removeban', RequestTemplate.build({
                method: 'post',
                level: 'moderate',
                params: [{ name: 'player' }],
                noResponse: true,
                action: (req, params) => this.rcon.removeBan(params.player),
            })],
            ['reloadbans', RequestTemplate.build({
                method: 'post',
                level: 'moderate',
                noResponse: true,
                action: () => this.rcon.reloadBans(),
            })],
            ['restart', RequestTemplate.build({
                method: 'post',
                level: 'manage',
                params: [{ name: 'force', optional: true, parse: parseBoolean }],
                noResponse: true,
                action: (req, params) => this.monitor.killServer(!!params.force && params.force !== 'false'),
            })],
            ['isrestartlocked', RequestTemplate.build({
                method: 'get',
                level: 'view',
                action: () => this.monitor.restartLock,
            })],
            ['lockrestart', RequestTemplate.build({
                method: 'post',
                level: 'manage',
                noResponse: true,
                action: () => this.monitor.restartLock = true,
            })],
            ['unlockrestart', RequestTemplate.build({
                method: 'post',
                level: 'manage',
                noResponse: true,
                action: () => this.monitor.restartLock = false,
            })],
            ['metrics', RequestTemplate.build({
                method: 'get',
                level: 'manage',
                disableDiscord: true,
                params: [{ name: 'type', location: 'query' }, { name: 'since', optional: true, location: 'query', parse: parseNumber }],
                action: (req, params) => this.metrics.fetchMetrics(params.type, params.since ? Number(params.since) : undefined),
            })],
            ['deleteMetrics', RequestTemplate.build({
                method: 'delete',
                level: 'admin',
                disableDiscord: true,
                params: [{name: 'maxAgeDays'}],
                noResponse: true,
                action: (req, params) => {
                    const days = Number(params.maxAgeDays);
                    if (days > 0) {
                        this.metrics.deleteMetrics(days * 24 * 60 * 60 * 1000);
                    }
                },
            })],
            ['logs', RequestTemplate.build({
                method: 'get',
                level: 'manage',
                disableDiscord: true,
                params: [{ name: 'type', location: 'query' }, { name: 'since', optional: true, location: 'query', parse: parseNumber }],
                action: (req, params) => this.logReader.fetchLogs(params.type, params.since ? Number(params.since) : undefined),
            })],
            ['login', RequestTemplate.build({
                method: 'post',
                level: 'view',
                disableDiscord: true,
                action: (req) => {
                    const userLevel = this.manager.getUserLevel(req.user);
                    if (userLevel) {
                        this.log.log(LogLevel.IMPORTANT, `User ${req.user} logged in`);
                    }
                    return userLevel;
                },
            })],
            ['config', RequestTemplate.build({
                method: 'get',
                level: 'admin',
                disableDiscord: true,
                action: () => this.manager.config,
            })],
            ['updateconfig', RequestTemplate.build({
                method: 'post',
                level: 'admin',
                disableDiscord: true,
                params: [{ name: 'config' }],
                action: (req, params) => {
                    try {
                        this.configFileHelper.writeConfig(params.config);
                        return true;
                    } catch (e) {
                        throw new Response(HTTP.HTTP_STATUS_BAD_REQUEST, e);
                    }
                },
            })],
            ['updatemods', RequestTemplate.build({
                method: 'post',
                level: 'manage',
                disableDiscord: true,
                params: [{ name: 'validate', optional: true, parse: parseBoolean }, { name: 'force', optional: true, parse: parseBoolean }],
                action: (req, params) => this.steamCmd.updateAllMods({
                    validate: params?.validate,
                    force: params?.force,
                }),
            })],
            ['updateserver', RequestTemplate.build({
                method: 'post',
                level: 'manage',
                disableDiscord: true,
                params: [{ name: 'validate', optional: true, parse: parseBoolean }],
                action: (req, params) => this.steamCmd.updateServer({
                    validate: params?.validate,
                }),
            })],
            ['backup', RequestTemplate.build({
                method: 'post',
                level: 'manage',
                noResponse: true,
                action: () => this.backup.createBackup(),
            })],
            ['getbackups', RequestTemplate.build({
                method: 'get',
                level: 'manage',
                action: () => this.backup.getBackups(),
            })],
            ['writemissionfile', RequestTemplate.build({
                method: 'post',
                level: 'manage',
                disableDiscord: true,
                params: [{ name: 'file' }, { name: 'content' }, { name: 'createBackup', optional: true, parse: parseBoolean }],
                noResponse: true,
                action: (req, params) => this.missionFiles.writeMissionFile(
                    params.file,
                    params.content,
                    params.createBackup,
                ),
            })],
            ['readmissionfile', RequestTemplate.build({
                method: 'get',
                level: 'manage',
                disableDiscord: true,
                params: [{ name: 'file', location: 'query' }],
                action: (req, params) => this.missionFiles.readMissionFile(params.file),
            })],
            ['readmissiondir', RequestTemplate.build({
                method: 'get',
                level: 'manage',
                disableDiscord: true,
                params: [{ name: 'dir', location: 'query' }],
                action: async (req, params) => this.missionFiles.readMissionDir(params.dir),
            })],
            ['writeprofilefile', RequestTemplate.build({
                method: 'post',
                level: 'manage',
                disableDiscord: true,
                params: [{ name: 'file' }, { name: 'content' }, { name: 'createBackup', optional: true, parse: parseBoolean }],
                noResponse: true,
                action: (req, params) => this.missionFiles.writeProfileFile(
                    params.file,
                    params.content,
                    params.createBackup,
                ),
            })],
            ['readprofilefile', RequestTemplate.build({
                method: 'get',
                level: 'manage',
                disableDiscord: true,
                params: [{ name: 'file', location: 'query' }],
                action: (req, params) => this.missionFiles.readProfileFile(params.file),
            })],
            ['readprofiledir', RequestTemplate.build({
                method: 'get',
                level: 'manage',
                disableDiscord: true,
                params: [{ name: 'dir', location: 'query' }],
                action: async (req, params) => this.missionFiles.readProfileDir(params.dir),
            })],
            ['serverinfo', RequestTemplate.build({
                method: 'get',
                level: 'view',
                disableDiscord: true,
                action: () => this.manager.getServerInfo(),
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
    private async actionRbacCheck(req: Request, x: RequestTemplate): Promise<Response | null> {
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

    private async actionParamsCheck(req: Request, template: RequestTemplate): Promise<Response | null> {
        for (const param of template.params || []) {
            const paramVal = req[param.location || 'body']?.[param.name];
            if (!param.optional && !paramVal) {
                return new Response(HTTP.HTTP_STATUS_BAD_REQUEST, `Missing param ${param.name}`);
            }
        }
        return null;
    }

    public async execute(req: Request, responsePartHandler?: ResponsePartHandler): Promise<Response> {
        if (!req.resource || !this.commandMap.has(req.resource)) {
            return new Response(
                HTTP.HTTP_STATUS_BAD_REQUEST,
                'Unkown action',
            );
        }

        const template = this.commandMap.get(req.resource);

        const interceptors: ((r: Request, t: RequestTemplate) => Promise<Response | null>)[] = [
            (r) => this.actionInitCheck(r),
            (r, t) => this.actionRbacCheck(r, t),
            (r, t) => this.actionParamsCheck(r, t),
        ];

        for (const interceptor of interceptors) {
            const resp = await interceptor(req, template);
            if (resp) {
                return resp;
            }
        }

        const resolvedParams = {} as Record<string, any>;
        template.params.forEach(
            (param) => {
                resolvedParams[param.name] = req[param.location || 'body']?.[param.name];
            },
        );

        /* istanbul ignore next */
        const responsePartHandlerWrapper: ResponsePartHandler = async (part) => {
            return (req.canStream && responsePartHandler) ? responsePartHandler(part) : undefined;
        }

        try {
            if (template.noResponse) {
                await template.action(req, resolvedParams, { partialResponseCallback: responsePartHandlerWrapper });
                return new Response(
                    HTTP.HTTP_STATUS_OK,
                    'Done',
                );
            } else {
                const result = await template.action(req, resolvedParams, { partialResponseCallback: responsePartHandlerWrapper });
                if (!result) {
                    return new Response(HTTP.HTTP_STATUS_NOT_FOUND, 'Action had no results');
                }
                return new Response(HTTP.HTTP_STATUS_OK, result);
            }
        } catch (e) {
            return this.handleExecutionError(req, e);
        }
    }

}
