import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { StubInstance, disableConsole, enableConsole, stubClass } from '../util';
import * as sinon from 'sinon';
import * as path from 'path';
import { Metrics } from '../../src/services/metrics';
import { DependencyContainer, Lifecycle, container } from 'tsyringe';
import { Manager } from '../../src/control/manager';
import { Database } from '../../src/services/database';
import { RCON } from '../../src/services/rcon';
import { SystemReporter } from '../../src/services/system-reporter';
import { MetricsCollector } from '../../src/services/metrics-collector';

describe('Test class Metrics', () => {

    let injector: DependencyContainer;

    let manager: StubInstance<Manager>;
    let database: StubInstance<Database>;
    let rcon: StubInstance<RCON>;
    let systemReporter: StubInstance<SystemReporter>;

    before(() => {
        disableConsole();
    });

    after(() => {
        enableConsole();
    });

    beforeEach(() => {
        // restore mocks
        ImportMock.restore();

        container.reset();
        injector = container.createChildContainer();

        injector.register(Manager, stubClass(Manager), { lifecycle: Lifecycle.Singleton });
        injector.register(Database, stubClass(Database), { lifecycle: Lifecycle.Singleton });
        injector.register(RCON, stubClass(RCON), { lifecycle: Lifecycle.Singleton });
        injector.register(SystemReporter, stubClass(SystemReporter), { lifecycle: Lifecycle.Singleton });

        manager = injector.resolve(Manager) as any;
        database = injector.resolve(Database) as any;
        rcon = injector.resolve(RCON) as any;
        systemReporter = injector.resolve(SystemReporter) as any;
    });

    it('Metrics', async () => {

        const db = {
            run: (sql) => {},
        };
        database.getDatabase.returns(db as any);
        rcon.getPlayers.resolves([]);
        systemReporter.getSystemReport.resolves({} as any);

        const metrics = injector.resolve(Metrics);

        await metrics.start();
        await metrics.stop();

        expect(metrics['timeout']).to.be.undefined;
        expect(metrics['interval']).to.be.undefined;

    });

    it('Metrics-tick', async () => {

        const db = {
            run: sinon.stub(),
        }
        database.getDatabase.returns(db as any);
        rcon = injector.resolve(RCON) as any;
        rcon.getPlayers.resolves([]);
        systemReporter.getSystemReport.resolves({} as any);

        manager.config = {
            metricPollIntervall: 10,
        } as any;

        const metrics = injector.resolve(Metrics);
        const metricsCollector = injector.resolve(MetricsCollector);
        metricsCollector.initialTimeout = 5;
        await metricsCollector.start();
        await metrics.start();
        
        await new Promise((r) => setTimeout(r, 40));
        
        await metrics.stop();
        await metricsCollector.stop();
        expect(metricsCollector['timeout']).to.be.undefined;
        expect(metricsCollector['interval']).to.be.undefined;

        expect(db.run.callCount).to.be.greaterThanOrEqual(3);

    });

    it('Metrics-delete', async () => {

        const db = {
            run: sinon.stub(),
        }
        database.getDatabase.returns(db as any);

        const metrics = injector.resolve(Metrics);
        
        await metrics.deleteMetrics(5);
        expect(db.run.callCount).to.be.greaterThanOrEqual(1);

    });

    it('Metrics-fetch', async () => {

        const db = {
            all: sinon.stub().returns([{
                timestamp: 1234,
                value: '{ "test": "test" }'
            }]),
        };
        database.getDatabase.returns(db as any);

        const metrics = injector.resolve(Metrics);
        
        const res = await metrics.fetchMetrics('SYSTEM');
        expect(res.length).to.equal(1);
        expect(res[0].value.test).to.equal('test');

    });

});
