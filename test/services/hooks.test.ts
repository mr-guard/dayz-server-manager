import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { StubInstance, disableConsole, enableConsole, sleep, stubClass } from '../util';
import { Hooks } from '../../src/services/hooks';
import { Hook, HookTypeEnum } from '../../src/config/config';
import { DependencyContainer, Lifecycle, container } from 'tsyringe';
import { Manager } from '../../src/control/manager';
import { Processes } from '../../src/services/processes';
import { EventBus } from '../../src/control/event-bus';
import { InternalEventTypes } from '../../src/types/events';
import * as sinon from 'sinon';

describe('Test class Hooks', () => {

    let injector: DependencyContainer;

    let manager: StubInstance<Manager>;
    let eventBus: EventBus;
    let processes: StubInstance<Processes>;

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
        injector.register(Processes, stubClass(Processes), { lifecycle: Lifecycle.Singleton });
        injector.register(EventBus, EventBus, { lifecycle: Lifecycle.Singleton });
        
        manager = injector.resolve(Manager) as any;
        eventBus = injector.resolve(EventBus);
        processes = injector.resolve(Processes) as any;
    });

    it('Hooks', async () => {

        let emitted = 0;
        eventBus.on(InternalEventTypes.DISCORD_MESSAGE, async () => emitted++);

        manager.config = {
            hooks: [
                {
                    type: 'beforeStart',
                    program: 'p1',
                },
                {
                    type: 'beforeStart',
                    program: 'p2',
                }
            ] as Hook[],
        } as any;

        const hooks = injector.resolve(Hooks);
        processes.spawnForOutput.withArgs('p1').returns(Promise.resolve({
            status: 0,
            stdout: '',
            stderr: '',
        }));
        processes.spawnForOutput.withArgs('p2').returns(Promise.resolve({
            status: 1,
            stdout: '',
            stderr: '',
        }));

        await hooks.executeHooks(HookTypeEnum.beforeStart);

        // await async listeners
        await sleep(10);

        expect(processes.spawnForOutput.callCount).to.equal(2);
        expect(emitted).to.equal(1);

    });

});
