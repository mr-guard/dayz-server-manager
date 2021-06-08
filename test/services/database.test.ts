import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { disableConsole, enableConsole } from '../util';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import * as sqlite from 'better-sqlite3';
import { Database, DatabaseTypes, Sqlite3Wrapper } from '../../src/services/database';

describe('Test class Database', () => {

    let origCreate;
    let createCalled = false;

    before(() => {
        disableConsole();
        origCreate = Sqlite3Wrapper['createDb'];
        Sqlite3Wrapper['createDb'] = () => {
            createCalled = true;
            return {
                prepare: (sql) => ({
                    all: sinon.stub(),
                    run: sinon.stub(),
                    get: sinon.stub(),
                }),
                close: sinon.stub(),
            } as any;
        }
    });

    after(() => {
        enableConsole();
        Sqlite3Wrapper['createDb'] = origCreate;
    });

    beforeEach(() => {
        // restore mocks
        ImportMock.restore();
        createCalled = false;
    });

    it('Database', async () => {
        
        const manager = {};

        const db = new Database(manager as any);

        await db.start();
        expect(createCalled).to.be.false;

        const metricsdb = db.getDatabase(DatabaseTypes.METRICS);
        expect(createCalled).to.be.true;
        expect(metricsdb).to.be.not.undefined;

        await db.stop();
        expect(db['databases']).to.be.empty;
        expect((metricsdb['db'].close as sinon.SinonStub).callCount).to.equal(1);

    });

});
