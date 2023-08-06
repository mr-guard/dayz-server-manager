import { expect } from '../expect';
import { StubInstance, disableConsole, enableConsole, memfs, stubClass } from '../util';
import * as sinon from 'sinon';
import { Backups } from '../../src/services/backups';
import { DependencyContainer, Lifecycle, container } from 'tsyringe';
import { Paths } from '../../src/services/paths';
import { FSAPI, InjectionTokens } from '../../src/util/apis';
import { Manager } from '../../src/control/manager';

describe('Test class Backups', () => {

    let injector: DependencyContainer;

    let manager: StubInstance<Manager>;
    let paths: Paths;
    let fs: FSAPI;

    before(() => {
        disableConsole();
    });

    after(() => {
        enableConsole();
    });

    beforeEach(() => {
        container.reset();
        injector = container.createChildContainer();

        fs = memfs({}, '/', injector);
        injector.register(InjectionTokens.childProcess, { useValue: {} });
        injector.register(Paths, Paths, { lifecycle: Lifecycle.Singleton });
        injector.register(Manager, stubClass(Manager), { lifecycle: Lifecycle.Singleton });

        paths = injector.resolve(Paths);
        manager = injector.resolve(Manager) as any;
    });

    it('Backups', async () => {

        // create some example mission
        fs.mkdirSync('/test/testserver/mpmissions', { recursive: true });
        fs.writeFileSync('/test/testserver/mpmissions/test.txt', 'test');

        paths.setCwd('/test');
        manager.config = {
            backupPath: '/test/backups',
            backupMaxAge: 1,
        } as any;
        manager.getServerPath.returns('/test/testserver');

        const backup = injector.resolve(Backups);

        await backup.createBackup();

        expect(fs.existsSync('/test/backups')).to.be.true;
        const backups = fs.readdirSync('/test/backups', { withFileTypes: true });
        expect(backups.length).to.equal(1);

    });

    it('Backups-cleanup', async () => {

        // create an existing backup to get deleted
        fs.mkdirSync('/test/backups/mpmissions_at_some_time', { recursive: true });

        paths.setCwd('/test');
        manager.config = {
            backupPath: '/test/backups',
            backupMaxAge: 0,
        } as any;
        manager.getServerPath.returns('/test/testserver');

        const backup = injector.resolve(Backups);

        const unlinkStub = sinon.stub(paths, 'removeLink');

        // wait so cleanup detects the old folder
        await new Promise((r) => setTimeout(r, 10));

        await backup.cleanup();

        expect(unlinkStub.callCount).to.equal(1);

    });

});
