import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { disableConsole, enableConsole } from '../util';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import { Metrics } from '../../src/services/metrics';

describe('Test class Metrics', () => {

    before(() => {
        disableConsole();
    });

    after(() => {
        enableConsole();
    });

    beforeEach(() => {
        // restore mocks
        ImportMock.restore();
    });

    it('Metrics', async () => {

        const manager = {
            database: {
                metricsDb: {
                    run: (sql) => {},
                },
            },
            rcon: {
                getPlayers: async () => [],
            },
            monitor: {
                getSystemReport: async () => ({})
            },
        } as any;

        const metrics = new Metrics(manager);

        await metrics.start();
        await metrics.stop();

        expect(metrics['timeout']).to.be.undefined;
        expect(metrics['interval']).to.be.undefined;

    });

    it('Metrics-tick', async () => {

        const manager = {
            database: {
                metricsDb: {
                    run: sinon.stub(),
                },
            },
            rcon: {
                getPlayers: async () => [],
            },
            monitor: {
                getSystemReport: async () => ({})
            },
            config: {
                metricPollIntervall: 10,
            },
        };

        const metrics = new Metrics(manager as any);
        metrics['initialTimeout'] = 5;
        await metrics.start();
        
        await new Promise((r) => setTimeout(r, 40));
        
        await metrics.stop();
        expect(metrics['timeout']).to.be.undefined;
        expect(metrics['interval']).to.be.undefined;

        expect(manager.database.metricsDb.run.callCount).to.be.greaterThanOrEqual(3);

    });

    it('Metrics-delete', async () => {

        const manager = {
            database: {
                metricsDb: {
                    run: sinon.stub(),
                },
            },
        };

        const metrics = new Metrics(manager as any);
        
        await metrics.deleteMetrics(5);
        expect(manager.database.metricsDb.run.callCount).to.be.greaterThanOrEqual(1);

    });

    it('Metrics-fetch', async () => {

        const manager = {
            database: {
                metricsDb: {
                    all: sinon.stub().returns([{
                        timestamp: 1234,
                        value: '{ "test": "test" }'
                    }]),
                },
            },
        };

        const metrics = new Metrics(manager as any);
        
        const res = await metrics.fetchMetrics('SYSTEM');
        expect(res.length).to.equal(1);
        expect(res[0].value.test).to.equal('test');

    });

});
