import * as sqlite3 from 'better-sqlite3';
import { Manager } from '../control/manager';
import { IStatefulService } from '../types/service';
import { Logger, LogLevel } from '../util/logger';

class Sqlite3Wrapper {

    private db: sqlite3.Database;

    public constructor(file: string, readonly?: boolean) {
        this.db = new sqlite3(file, {
            readonly,
        });
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


export class Database implements IStatefulService {

    private log = new Logger('Database');

    private metricsDb: Sqlite3Wrapper;

    public constructor(
        public manager: Manager,
    ) {
        this.log.log(LogLevel.INFO, `Database Setup: node ${process.versions.node} : v${process.versions.modules}-${process.platform}-${process.arch}`);
    }

    public async start(): Promise<void> {
        await this.stop();

        this.metricsDb = new Sqlite3Wrapper('metrics.db', false);
    }

    public async stop(): Promise<void> {
        if (this.metricsDb) {
            this.metricsDb.close();
            this.metricsDb = undefined;
        }
    }

}
