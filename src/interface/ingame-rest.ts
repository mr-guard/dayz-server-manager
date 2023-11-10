/* istanbul ignore file */
/* No tests because its experimental and changes a lot */

import * as express from 'express';
import * as path from 'path';
import { loggerMiddleware } from '../middleware/logger';

import { Manager } from '../control/manager';
import { Server } from 'http';
import { LogLevel } from '../util/logger';
import { IStatefulService } from '../types/service';
import { LoggerFactory } from '../services/loggerfactory';
import { inject, injectable, singleton } from 'tsyringe';
import { Database } from '../services/database';
import { IngameReport } from '../services/ingame-report';
import { FSAPI, InjectionTokens } from '../util/apis';
import { Paths } from '../services/paths';

interface IngameConfig {
    host: string;
    key: string;
    useApiForReport: boolean;
    reportInterval: number;
}

@singleton()
@injectable()
export class IngameREST extends IStatefulService {

    public express: express.Application | undefined;
    public server: Server | undefined;

    public host: string | undefined;
    public port: number | undefined;

    public constructor(
        loggerFactory: LoggerFactory,
        private manager: Manager,
        private db: Database,
        private ingameReport: IngameReport,
        private paths: Paths,
        @inject(InjectionTokens.fs) private fs: FSAPI,
    ) {
        super(loggerFactory.createLogger('IngameREST'));
    }

    /* istanbul ignore next function for easier tests */
    public createExpress(): express.Application {
        return (express as any)();
    }

    public async start(): Promise<void> {
        this.express = this.createExpress();

        if ((this.manager.config.ingameApiPort ?? 0) > 0) {
            this.port = this.manager.config.ingameApiPort;
        } else {
            this.port = this.manager.config.serverPort + 10;
        }

        this.host = this.manager.config.publishIngameApi ? '0.0.0.0' : '127.0.0.1';

        this.fs.mkdirSync(this.manager.getProfilesPath(), { recursive: true });
        const ingameConfigPath = path.join(this.manager.getProfilesPath(), 'DZSMApiOptions.json');
        this.fs.writeFileSync(
            ingameConfigPath,
            JSON.stringify({
                host: this.manager.config.ingameApiHostOverride || `127.0.0.1:${this.port}`,
                key: this.manager.config.ingameApiKey,
                useApiForReport: this.manager.config.ingameReportViaRest || false,
                reportInterval: this.manager.config.ingameReportIntervall || 30.0,
                dataDump: this.manager.config.dataDump || false,
            } as IngameConfig),
            { encoding: 'utf-8' },
        );

        // middlewares
        this.express.use(express.text())
        this.express.use(express.json({ limit: '50mb' }));
        this.express.use(express.urlencoded({ extended: true }));
        this.express.use(loggerMiddleware);

        // controllers
        this.setupControllers();

        return new Promise(
            (r) => {
                this.server = this.express!.listen(
                    this.port,
                    this.host,
                    () => {
                        this.log.log(LogLevel.IMPORTANT, `Ingame Rest API listening on the http://${this.host}:${this.port}`);
                        r();
                    },
                );
            },
        );

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

    private setupControllers(): void {

        this.express.use((req, res, next) => {
            if (!req.query.key || req.query.key !== this.manager.config.ingameApiKey) {
                res.status(401).send();
                return;
            }
            next();
        });

        this.express.post(
            '/ingamereport',
            async (req, res) => { // NOSONAR
                try {
                    await this.ingameReport.processIngameReport(req.body);
                    res.status(200).send(JSON.stringify({ status: 200 }));
                } catch {
                    res.status(500).send(JSON.stringify({ status: 500 }));
                }
            },
        );

        const stringifyValue = (value: any): string => {
            if (value === null || value === undefined) {
                return '';
            }

            if (typeof value === 'boolean') {
                return value ? '1' : '0';
            }

            return `${value}`;
        };

        const serializeResult = (results: any[]): string => {
            if (!results?.length) {
                return '';
            }

            return JSON.stringify(
                results.map((row) => row.map((col: any) => stringifyValue(col))),
            );
        }

        this.express.post(
            '/:dbName/query',
            (req, res) => {
                try {
                    const db = this.db.getDatabase(req.params.dbName as any);
                    if (req.body?.toLowerCase().trim().startsWith('select')) {
                        const results = db.allRaw(req.body);
                        this.log.log(LogLevel.DEBUG, 'Query results', results);
                        res.send(results?.length ? serializeResult(results) : '[]');
                    } else {
                        db.run(req.body);
                        res.send('[]');
                    }
                } catch (e) {
                    this.log.log(LogLevel.ERROR, 'Query error', e);
                    res.status(500).send(JSON.stringify({ status: 500 }));
                }
            },
        );

        this.express.post(
            '/:dbName/queryNoStrict',
            (req, res) => {
                try {
                    const db = this.db.getDatabase(req.params.dbName as any);
                    if (req.body?.toLowerCase().trim().startsWith('select')) {
                        const results = db.allRaw(req.body);
                        this.log.log(LogLevel.DEBUG, 'QueryNoStrict result', results);
                        res.send(results?.length ? serializeResult(results) : '[]');
                    } else {
                        db.run(req.body);
                        res.send('[]');
                    }
                } catch (e) {
                    this.log.log(LogLevel.ERROR, 'QueryNoStrict error', e);
                    res.send('[]');
                }
            },
        );

        this.express.post(
            '/:dbName/transaction',
            (req, res) => {
                try {
                    const queries = JSON.parse(req.body) as string[];
                    const db = this.db.getDatabase(req.params.dbName as any);
                    const results = db.transaction((sqlDb) => {
                        for (let i = 0; i < queries.length; i++) {
                            this.log.log(LogLevel.DEBUG, 'Transaction query', queries[i]);
                            if (i === (queries.length - 1) && queries[i]?.toLowerCase().trim().startsWith('select')) {
                                return sqlDb.prepare(queries[i]).raw().all();
                            } else {
                                sqlDb.prepare(queries[i]).run();
                            }
                        }
                    });
                    this.log.log(LogLevel.DEBUG, 'Transaction results', results);
                    res.send(results?.length ? serializeResult(results) : '[]');
                } catch (e) {
                    this.log.log(LogLevel.ERROR, 'Transaction error', e);
                    res.status(500).send(JSON.stringify({ status: 500 }));
                }
            },
        );

    }

}
