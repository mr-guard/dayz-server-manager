import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { StubInstance, disableConsole, enableConsole, memfs, stubClass } from '../util';
import * as sinon from 'sinon';
import * as path from 'path';
import * as tail from 'tail';
import { ServerState } from '../../src/types/monitor';
import { LogReader } from '../../src/services/log-reader';
import { DependencyContainer, Lifecycle, container } from 'tsyringe';
import { Manager } from '../../src/control/manager';
import { Monitor } from '../../src/services/monitor';
import { FSAPI } from '../../src/util/apis';
import { EventBus } from '../../src/control/event-bus';
import { InternalEventTypes } from '../../src/types/events';

describe('Test class LogReader', () => {

    let injector: DependencyContainer;

    let manager: StubInstance<Manager>;
    let eventBus: EventBus;
    let fs: FSAPI;

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
        injector.register(EventBus, EventBus, { lifecycle: Lifecycle.Singleton });
        fs = memfs({}, '/', injector);

        manager = injector.resolve(Manager) as any;
        eventBus = injector.resolve(EventBus);
    });

    it('LogReader-scan', async () => {

        fs = memfs(
            {
                '/testserver/profs': {
                    'server.rpt': 'test',
                    'server.adm': 'test',
                    'script.log': 'test',
                    'test.txt': 'test',
                },
            },
            '/',
            injector,
        );

        const tailMock = ImportMock.mockClass<tail.Tail>(
            tail,
            'Tail',
        );
        let lineRegister = 0;
        tailMock.set('on', (t, c) => {
            if (t === 'line') {
                lineRegister++;
                c('test');
            }
        });

        
        manager.getProfilesPath.returns('/testserver/profs');

        const logReader = injector.resolve(LogReader);
        logReader.initDelay = 10;


        await logReader.start();
        eventBus.emit(InternalEventTypes.MONITOR_STATE_CHANGE, ServerState.STARTED, undefined as any);
        await new Promise((r) => setTimeout(r, 100));
        await logReader.stop();

        expect(lineRegister).to.equal(3);
    });

    it('LogReader-fetchLogs', async () => {

        const logReader = injector.resolve(LogReader);

        logReader['logMap']['RPT']!.logLines = [
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
