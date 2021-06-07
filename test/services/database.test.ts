import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { disableConsole, enableConsole } from '../util';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import * as sqlite from 'better-sqlite3';
import { Database, Sqlite3Wrapper } from '../../src/services/database';

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
                close: () => {},
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
        await db.stop();

        expect(createCalled).to.be.true;
        expect(db.metricsDb).to.be.undefined;
        
    });

});
