import * as express from 'express';
import * as basicAuth from 'express-basic-auth';
import * as compression from 'compression';
import * as path from 'path';
import { loggerMiddleware } from '../middleware/logger';

import { Manager } from '../control/manager';
import { Server } from 'http';
import { Request } from '../types/interface';
import { LogLevel } from '../util/logger';
import { IService } from '../types/service';
import { LoggerFactory } from '../services/loggerfactory';
import { injectable, singleton } from 'tsyringe';
import { EventBus } from '../control/event-bus';
import { InternalEventTypes } from '../types/events';

@singleton()
@injectable()
export class REST extends IService {

    public express: express.Application | undefined;
    public server: Server | undefined;

    public host: string | undefined;
    public port: number | undefined;

    public path = '/';
    public router = express.Router();

    private readonly UI_FILES = path.join(__dirname, '../ui');

    public constructor(
        loggerFactory: LoggerFactory,
        private manager: Manager,
        private eventBus: EventBus,
    ) {
        super(loggerFactory.createLogger('REST'));
    }

    /* istanbul ignore next function for easier tests */
    public createExpress(): express.Application {
        return express();
    }

    public async start(): Promise<void> {
        this.express = this.createExpress();

        this.port = this.manager.getWebPort();
        this.host = this.manager.config.publishWebServer ? '0.0.0.0' : '127.0.0.1';

        // middlewares
        this.express.use(compression());
        this.express.use(express.json({ limit: '50mb' }));
        this.express.use(express.urlencoded({ extended: true }));
        this.express.use(loggerMiddleware);

        // static content
        this.express.use(express.static(this.UI_FILES));

        this.setupExpress();

        // controllers
        this.express.get(
            '/version',
            /* istanbul ignore next */
            (req, res) => res.send(this.manager.APP_VERSION),
        );
        this.express.use(
            '/api',
            this.router,
        );
        await this.setupRouter();

        return new Promise(
            (r) => {
                this.server = this.express!.listen(
                    this.port,
                    this.host,
                    () => {
                        this.log.log(LogLevel.IMPORTANT, `App listening on the http://${this.host}:${this.port}`);
                        r();
                    },
                );
            },
        );

    }

    private setupExpress(): void {
        // cors
        this.express.all(
            '*',
            /* istanbul ignore next */
            (req, res, next) => this.handleCors(req, res, next),
        );

        this.express.get(
            '/login',
            /* istanbul ignore next */
            (req, res) => this.handleUiFileRequest(req, res),
        );
        this.express.get(
            '/dashboard/*',
            /* istanbul ignore next */
            (req, res) => this.handleUiFileRequest(req, res),
        );
        this.express.get(
            '/dashboard',
            /* istanbul ignore next */
            (req, res) => this.handleUiFileRequest(req, res),
        );
    }

    private handleCors(req: express.Request, res: express.Response, next: express.NextFunction): void {
        const origin = req.header('Origin')?.toLowerCase() ?? '';
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        res.header('Access-Control-Allow-Credentials', 'true');

        if (req.method?.toLowerCase() === 'options') {
            res.sendStatus(204);
            return;
        }

        next();
    }

    private handleUiFileRequest(req: express.Request, res: express.Response): void {
        res.sendFile(path.join(this.UI_FILES, 'index.html'));
    }

    private async setupRouter(): Promise<void> {

        const users: { [k: string]: string } = {};
        for (const user of (this.manager.config?.admins ?? [])) {
            users[user.userId] = user.password;
        }
        this.router.use(basicAuth({ users, challenge: false }));

        const commandMap = (await this.eventBus.request(InternalEventTypes.INTERFACE_COMMANDS)) || [];
        for (const [resource, command] of commandMap) {

            if (command.disableRest) continue;

            this.log.log(LogLevel.DEBUG, `Registering ${command.method} ${resource}`);
            (this.router as any)[command.method](
                `/${resource}`,
                /* istanbul ignore next */
                (req, res) => {
                    void this.handleCommand(
                        req,
                        res,
                        resource,
                    );
                },
            );
        }
    }

    private async handleCommand(
        req: express.Request,
        res: express.Response,
        resource: string,
    ): Promise<void> {
        if (!this.manager.initDone) {
            res.sendStatus(503);
            return;
        }

        const base64Credentials = req.headers.authorization?.split(' ')[1];
        const username = base64Credentials
            ? Buffer.from(base64Credentials, 'base64')?.toString('ascii')?.split(':')[0]
            : '';

        const internalRequest = new Request();
        internalRequest.accept = req.headers.accept ?? 'application/json';
        internalRequest.body = req.body;
        internalRequest.query = req.query;
        internalRequest.resource = resource;
        internalRequest.user = username;

        const internalResponse = await this.eventBus.request(InternalEventTypes.INTERFACE_REQUEST, internalRequest);

        res.status(internalResponse.status).send(internalResponse.body);
    }

    public stop(): Promise<void> {
        return new Promise<void>((r, e) => {
            if (!this.server || !this.server.listening) {
                r();
            }

            this.server?.close((error) => {
                if (error) {
                    e(error);
                } else {
                    r();
                }
            });
        });
    }

}
