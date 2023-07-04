import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { StubInstance, disableConsole, enableConsole, stubClass } from '../util';
import { Hooks } from '../../src/services/hooks';
import { Hook, HookTypeEnum } from '../../src/config/config';
import { DependencyContainer, Lifecycle, container } from 'tsyringe';
import { Manager } from '../../src/control/manager';
import { Processes } from '../../src/services/processes';
import { DiscordBot } from '../../src/services/discord';

describe('Test class Hooks', () => {

    let injector: DependencyContainer;

    let manager: StubInstance<Manager>;
    let discord: StubInstance<DiscordBot>;
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
        injector.register(DiscordBot, stubClass(DiscordBot), { lifecycle: Lifecycle.Singleton });

        manager = injector.resolve(Manager) as any;
        discord = injector.resolve(DiscordBot) as any;
        processes = injector.resolve(Processes) as any;
    });

    it('Hooks', async () => {

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

        expect(processes.spawnForOutput.callCount).to.equal(2);
        expect(discord.relayRconMessage.callCount).to.equal(1);

    });

});
