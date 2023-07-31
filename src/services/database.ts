import * as sqlite3 from 'better-sqlite3';
import { Manager } from '../control/manager';
import { IStatefulService } from '../types/service';
import { LogLevel } from '../util/logger';
import { injectable, singleton } from 'tsyringe';
import { LoggerFactory } from './loggerfactory';

/* istanbul ignore next */
export class Sqlite3Wrapper {

    private static createDb(
        file: string,
        opts: sqlite3.Options,
    ): sqlite3.Database {
        return new (sqlite3 as any)(file, opts);
    }

    private db: sqlite3.Database;

    public constructor(file: string, opts?: sqlite3.Options) {
        this.db = Sqlite3Wrapper.createDb(file, opts);
    }

    /**
     * Fire (optionally wait until executed) but no results
     * @param sql the query
     * @param params the params
     */
    public run(sql: string, ...params: any[]): sqlite3.RunResult {
        const stmt = this.db.prepare(sql);
        return stmt.run(params);
    }

    /**
     * first result only
     * @param sql the query
     * @param params the params
     */
    public first(sql: string, ...params: any[]): any {
        const stmt = this.db.prepare(sql);
        return stmt.get(params);
    }

    /**
     * all results
     * @param sql the query
     * @param params the params
     */
    public all(sql: string, ...params: any[]): any[] {
        const stmt = this.db.prepare(sql);
        return stmt.all(params);
    }

    public close(): void {
        this.db.close();
    }

}

// eslint-disable-next-line no-shadow
export enum DatabaseTypes {
    METRICS,
}

interface DbConfig {
    file: string;
    opts: sqlite3.Options;
}

@singleton()
@injectable()
export class Database extends IStatefulService {

    private databases = new Map<DatabaseTypes, Sqlite3Wrapper>();
    private dbConfigs = new Map<DatabaseTypes, DbConfig>([
        [
            DatabaseTypes.METRICS,
            {
                file: 'metrics.db',
                opts: {
                    readonly: false,
                },
            },
        ],
    ]);

    public constructor(
        loggerFactory: LoggerFactory,
        public manager: Manager,
    ) {
        super(loggerFactory.createLogger('Database'));
        this.log.log(LogLevel.INFO, `Database Setup: node ${process.versions.node} : v${process.versions.modules}-${process.platform}-${process.arch}`);
    }

    public async start(): Promise<void> {
        // nothing to do, since we lazy init
    }

    public async stop(): Promise<void> {
        for (const db of this.databases.entries()) {
            if (db[1]) {
                db[1].close();
            }
            this.databases.delete(db[0]);
        }
    }

    public getDatabase(type: DatabaseTypes): Sqlite3Wrapper {

        if (!this.databases.has(type)) {
            this.databases.set(
                type,
                new Sqlite3Wrapper(
                    this.dbConfigs.get(type).file,
                    this.dbConfigs.get(type).opts,
                ),
            );
        }

        return this.databases.get(type);

    }

}
