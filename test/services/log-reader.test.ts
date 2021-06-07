import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { disableConsole, enableConsole } from '../util';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import * as tail from 'tail';
import { ServerState } from '../../src/types/monitor';
import { LogReader } from '../../src/services/log-reader';

describe('Test class LogReader', () => {

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

    it('LogReader', async () => {

        ImportMock.mockFunction(
            fs.promises,
            'readdir',
            Promise.resolve([
                'server.rpt',
                'server.adm',
                'script.log',
                'test.txt',
            ]),
        );

        const statMock = ImportMock.mockFunction(
            fs.promises,
            'stat',
            Promise.resolve({
                mtime: new Date(),
            }),
        );

        const tailMock = ImportMock.mockClass<tail.Tail>(
            tail,
            'Tail',
        );
        tailMock.set('on', (t, c) => {
            if (t === 'line') c('test');
        });

        const manager = {
            monitor: {
                registerStateListener: (t, c) => c(ServerState.STARTED),
            },
            config: {
                profilesPath: 'profs',
            },
            getServerPath: () => 'testserver',
        } as any;

        const logReader = new LogReader(manager);
        logReader['initDelay'] = 10;


        await logReader.start();
        await new Promise((r) => setTimeout(r, 20));
        await logReader.stop();

        expect(statMock.callCount).to.equal(3);
    });

    it('LogReader', async () => {

        const logReader = new LogReader(null);

        logReader['logMap']['RPT'].logLines = [
            { timestamp: 1, message: 'test 1' },
            { timestamp: 2, message: 'test 2' },
            { timestamp: 3, message: 'test 3' },
            { timestamp: 4, message: 'test 4' },
            { timestamp: 5, message: 'test 5' },
        ];

        const all = await logReader.fetchLogs('RPT');
        const last2 = await logReader.fetchLogs('RPT', 3);

        expect(all.length).to.equal(5);
        expect(last2.length).to.equal(2);
    });

});
