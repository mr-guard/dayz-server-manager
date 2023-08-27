import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { StubInstance, disableConsole, enableConsole, memfs, stubClass } from '../util';
import { MissionFiles } from '../../src/services/mission-files';
import { DependencyContainer, Lifecycle, container } from 'tsyringe';
import { Manager } from '../../src/control/manager';
import { Backups } from '../../src/services/backups';
import { Hooks } from '../../src/services/hooks';
import { FSAPI, InjectionTokens } from '../../src/util/apis';
import { HookTypeEnum } from '../../src/config/config';
import { Paths } from '../../src/services/paths';

describe('Test class MissionFiles', () => {

    let injector: DependencyContainer;

    let manager: StubInstance<Manager>;
    let backups: StubInstance<Backups>;
    let hooks: StubInstance<Hooks>;
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
        injector.register(Backups, stubClass(Backups), { lifecycle: Lifecycle.Singleton });
        injector.register(Hooks, stubClass(Hooks), { lifecycle: Lifecycle.Singleton });
        injector.register(Paths, Paths, { lifecycle: Lifecycle.Singleton });
        injector.register(InjectionTokens.childProcess, { useValue: {} }); // dependency of Paths
        
        fs = memfs({}, '/', injector);

        manager = injector.resolve(Manager) as any;
        backups = injector.resolve(Backups) as any;
        hooks = injector.resolve(Hooks) as any;
    });

    it('MissionFiles-read', async () => {

        fs = memfs(
            {
                'testserver': {
                    'mpmissions': {
                        'dayz.chernarusplus': {
                            'test.txt': 'test',
                        },
                    },
                },
            },
            '/',
            injector,
        );

        manager.getServerPath.returns('/testserver');
        manager.getServerCfg.resolves({
                Missions: {
                    DayZ: {
                        template: 'dayz.chernarusplus',
                    },
                },
            } as any);

        const files = injector.resolve(MissionFiles);

        const content = await files.readMissionFile('test.txt');

        expect(content).to.equal('test');

    });

    it('MissionFiles-readDir', async () => {

        fs = memfs(
            {
                'testserver': {
                    'mpmissions': {
                        'dayz.chernarusplus': {
                            'test': {},
                            'testfile': 'testcontent',
                        },
                    },
                },
            },
            '/',
            injector,
        );

        manager.getServerPath.returns('/testserver');
        manager.getServerCfg.resolves({
                Missions: {
                    DayZ: {
                        template: 'dayz.chernarusplus',
                    },
                },
            } as any);

        const files = injector.resolve(MissionFiles);

        const content = await files.readMissionDir('/');

        expect(content.length).to.equal(2);
        expect(content).to.include('test/');
        expect(content).to.include('testfile');

    });

    it('MissionFiles-write', async () => {

        manager.getServerPath.returns('/testserver');
        manager.getServerCfg.resolves({
                Missions: {
                    DayZ: {
                        template: 'dayz.chernarusplus',
                    },
                },
            } as any);

        const files = injector.resolve(MissionFiles);

        await files.writeMissionFile('test.txt', 'test');

        const expectedPath = '/testserver/mpmissions/dayz.chernarusplus/test.txt';
        expect(fs.existsSync(expectedPath)).to.be.true;
        expect(fs.readFileSync(expectedPath) + '').to.equal('test');

        expect(hooks.executeHooks.callCount).to.equal(1);
        expect(hooks.executeHooks.firstCall.args[0]).to.equal(HookTypeEnum.missionChanged);

    });

});
