import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as basicAuth from 'express-basic-auth';
// import * as cors from 'cors';
import * as path from 'path';
import { loggerMiddleware } from '../middleware/logger';

import { Manager } from '../control/manager';
import { Server } from 'node:http';
import { Request } from '../types/interface';
import { Logger, LogLevel } from '../util/logger';


export class REST {

    private static log = new Logger('REST');

    public express: express.Application | undefined;
    public server: Server | undefined;
    public port: number | undefined;

    public path = '/';
    public router = express.Router();

    public constructor(
        public manager: Manager,
    ) {}

    public start(): Promise<void> {
        this.express = express();

        this.port = this.manager.getWebPort();

        // middlewares
        this.express.all('*', (req, res, next) => {
            const origin = req.header('Origin')?.toLowerCase() ?? '';
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            res.header('Access-Control-Allow-Credentials', 'true');

            if (req.method?.toLowerCase() === 'options') {
                res.sendStatus(204);
                return;
            }

            next();
        });

        this.express.use(bodyParser.json());
        this.express.use(bodyParser.urlencoded({ extended: true }));
        this.express.use(loggerMiddleware);

        const users: { [k: string]: string } = {};
        for (const user of (this.manager.config?.admins ?? [])) {
            users[user.userId] = user.password;
        }

        // static content
        this.express.use(express.static(path.join(__dirname, '../ui')));

        // controllers
        this.express.use(
            '/api',
            this.router,
        );
        this.router.use(basicAuth({ users, challenge: false }));
        this.setupRouter();

        return new Promise(
            (r) => {
                this.server = this.express!.listen(
                    this.port,
                    () => {
                        REST.log.log(LogLevel.IMPORTANT, `App listening on the http://localhost:${this.port}`);
                        r();
                    },
                );
            },
        );

    }

    private setupRouter(): void {

        this.express.get('/login', (req, res) => {
            res.redirect(301, '/');
        });
        this.express.get('/dashboard/*', (req, res) => {
            res.redirect(301, '/');
        });
        this.express.get('/dashboard', (req, res) => {
            res.redirect(301, '/');
        });

        for (const [resource, command] of this.manager.interface!.commandMap) {

            if (command.disableRest) continue;

            REST.log.log(LogLevel.DEBUG, `Registering ${command.method} ${resource}`);
            (this.router as any)[command.method](
                `/${resource}`,
                // `/${path}`,
                async (req: express.Request, res: express.Response) => {
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

                    const internalResponse = await this.manager.interface.execute(internalRequest);

                    res.status(internalResponse.status).send(internalResponse.body);
                },
            );
        }

        this.express.post('/ingame/stats', (req, res) => {
            if (req.params.token === this.manager.getIngameToken()) {
                void this.manager.metrics.pushIngameStats(req.body);
            }
            res.send();
        });
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
