import { expect } from '../expect';
import { StubInstance, disableConsole, enableConsole, stubClass } from '../util';
import * as sinon from 'sinon';
import { Database, DatabaseTypes, Sqlite3Wrapper } from '../../src/services/database';
import { DependencyContainer, Lifecycle, container } from 'tsyringe';
import { Manager } from '../../src/control/manager';

describe('Test class Database', () => {

    let origCreate;
    let createCalled = 0;

    let injector: DependencyContainer;
    let manager: StubInstance<Manager>

    before(() => {
        disableConsole();
        origCreate = Sqlite3Wrapper['createDb'];
        Sqlite3Wrapper['createDb'] = () => {
            createCalled++;
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
        createCalled = 0;

        container.reset();
        injector = container.createChildContainer();
        injector.register(Manager, stubClass(Manager), { lifecycle: Lifecycle.Singleton });

        manager = injector.resolve(Manager) as any;
    });

    it('Database', async () => {
        
        const db = injector.resolve(Database);

        await db.start();
        expect(createCalled).to.equal(0);

        const metricsdb = db.getDatabase(DatabaseTypes.METRICS);
        expect(createCalled).to.be.greaterThan(0);
        expect(metricsdb).to.be.not.undefined;

        await db.stop();
        expect(db['databases']).to.be.empty;
        expect((metricsdb['db'].close as sinon.SinonStub).callCount).to.equal(1);

    });

});
