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

        const db = {
            run: (sql) => {},
        };
        const manager = {
            database: {
                getDatabase: (t) => db,
            },
            rcon: {
                getPlayers: async () => [],
            },
            monitor: {
                getSystemReport: async () => ({})
            },
        };

        const metrics = new Metrics(manager as any);

        await metrics.start();
        await metrics.stop();

        expect(metrics['timeout']).to.be.undefined;
        expect(metrics['interval']).to.be.undefined;

    });

    it('Metrics-tick', async () => {

        const db = {
            run: sinon.stub(),
        }
        const manager = {
            database: {
                getDatabase: (t) => db,
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

        expect(db.run.callCount).to.be.greaterThanOrEqual(3);

    });

    it('Metrics-delete', async () => {

        const db = {
            run: sinon.stub(),
        }
        const manager = {
            database: {
                getDatabase: (t) => db,
            },
        };

        const metrics = new Metrics(manager as any);
        
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
        const manager = {
            database: {
                getDatabase: (t) => db,
            },
        };

        const metrics = new Metrics(manager as any);
        
        const res = await metrics.fetchMetrics('SYSTEM');
        expect(res.length).to.equal(1);
        expect(res[0].value.test).to.equal('test');

    });

});
