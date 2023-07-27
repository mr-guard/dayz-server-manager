import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { StubInstance, disableConsole, enableConsole, stubClass } from '../util';
import * as sinon from 'sinon';
import * as cron from 'node-schedule';
import { Events } from '../../src/services/events';
import { EventTypeEnum } from '../../src/config/config';
import { ServerState } from '../../src/types/monitor';
import { DependencyContainer, Lifecycle, container } from 'tsyringe';
import { Monitor } from '../../src/services/monitor';
import { Manager } from '../../src/control/manager';
import { RCON } from '../../src/services/rcon';
import { Backups } from '../../src/services/backups';
import { EventBus } from '../../src/control/event-bus';

describe('Test class Events', () => {

    let injector: DependencyContainer;

    let manager: StubInstance<Manager>;
    let monitor: StubInstance<Monitor>;
    let rcon: StubInstance<RCON>;
    let backup: StubInstance<Backups>;

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
        injector.register(Monitor, stubClass(Monitor), { lifecycle: Lifecycle.Singleton });
        injector.register(RCON, stubClass(RCON), { lifecycle: Lifecycle.Singleton });
        injector.register(Backups, stubClass(Backups), { lifecycle: Lifecycle.Singleton });

        manager = injector.resolve(Manager) as any;
        monitor = injector.resolve(Monitor) as any;
        rcon = injector.resolve(RCON) as any;
        backup = injector.resolve(Backups) as any;
    });

    it('Events', async () => {

        const eventTypes = Object.keys(EventTypeEnum);
        const createdTasks: {
            cancel: sinon.SinonStub<any[], any>;
            name: any;
            cron: any;
            action: any;
        }[] = [];
        const cronMock = ImportMock.mockFunction(cron, 'scheduleJob');
        cronMock.callsFake((name, cron, action) => {
            const task = {
                cancel: sinon.stub(),
                nextInvocation: () => new Date(),
                name,
                cron,
                action,
            };
            createdTasks.push(task);
            return task;
        });

        manager.config = {
            events: eventTypes.map((x) => ({
                name: x,
                cron: '* * * * *',
                type: x,
                params: ['test']
            }))
        } as any;
        (monitor as any).serverState = ServerState.STOPPED;

        const events = injector.resolve(Events);

        await events.start();
        
        // before the server monitor is started, the actions should be skipped
        for (const task of createdTasks) {
            await task.action();
        }

        (monitor as any).serverState = ServerState.STARTED;
        for (const task of createdTasks) {
            await task.action();
        }
        
        await events.stop();

        expect(createdTasks.length).to.equal(eventTypes.length);
        expect(createdTasks.every((x) => x.cancel.callCount === 1)).to.be.true;

        expect(monitor.killServer.callCount).to.equal(1);
        expect(rcon.global.callCount).to.equal(1);
        expect(rcon.kickAll.callCount).to.equal(1);
        expect(rcon.lock.callCount).to.equal(1);
        expect(rcon.unlock.callCount).to.equal(1);

        expect(backup.createBackup.callCount).to.equal(2);

    });

});
