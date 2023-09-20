import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports';
import * as path from 'path';
import * as sinon from 'sinon';
import { StubInstance, disableConsole, enableConsole, memfs, stubClass } from '../util';
import { IngameReport } from '../../src/services/ingame-report';
import { DependencyContainer, Lifecycle, container } from 'tsyringe';
import { Manager } from '../../src/control/manager';
import { Metrics } from '../../src/services/metrics';
import { Paths } from '../../src/services/paths';
import { FSAPI } from '../../src/util/apis';
import { IngameReportContainer } from '../../src/types/ingame-report';

describe('Test class IngameReport', () => {

    let injector: DependencyContainer;

    let manager: StubInstance<Manager>;
    let metrics: StubInstance<Metrics>;
    let paths: StubInstance<Paths>;
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
        injector.register(Metrics, stubClass(Metrics), { lifecycle: Lifecycle.Singleton });
        injector.register(Paths, stubClass(Paths), { lifecycle: Lifecycle.Singleton });
        fs = memfs({}, '/', injector);

        manager = injector.resolve(Manager) as any;
        metrics = injector.resolve(Metrics) as any;
        paths = injector.resolve(Paths) as any;
    });

    it('IngameReport-processReport', async () => {

        const ingameReport = injector.resolve(IngameReport);
        
        await ingameReport.processIngameReport({
            players: [],
            vehicles: [],
        });
        
        expect(metrics.pushMetricValue.callCount).to.equal(2);

    });

    it('IngameReport-scan', async () => {

        fs = memfs(
            {
                '/testserver': {
                    'profiles': {
                        'DZSM-TICK.json': JSON.stringify({
                            players: [],
                            vehicles: [],
                        } as IngameReportContainer)
                    }
                },
            },
            '/',
            injector,
        );

        manager.getProfilesPath.returns('/testserver/profiles');
        
        const ingameReport = injector.resolve(IngameReport);

        ingameReport.intervalTimeout = 5;
        ingameReport.readTimeout = 0;
        
        const reportStub = sinon.stub(ingameReport, 'processIngameReport');

        await ingameReport.start();

        await new Promise((r) => setTimeout(r, ingameReport.intervalTimeout * 10));

        await ingameReport.stop();
        
        expect(reportStub.callCount).to.equal(1);

    });

    it('IngameReport-installMod', async () => {

        fs = memfs(
            {
                '/testserver': {
                    '@mod1': {},
                    'profiles': {}
                },
                [path.join(process.cwd(), 'src', 'mods')]: {
                    '@mod1': { 'file.txt': 'test' },
                    '@mod2': { 'file2.txt': 'test2' },
                }
            },
            '/',
            injector,
        );

        manager.getServerPath.returns('/testserver');
        manager.config = {
            profilesPath: 'profiles',
        } as any;
        
        const ingameReport = injector.resolve(IngameReport);
        
        paths.removeLink.returns(true);

        await ingameReport.installMod();
        
        expect(paths.removeLink.callCount).to.equal(1);
        expect(paths.copyFromPkg.callCount).to.equal(1);

    });

    it('IngameReport-getMods', async () => {

        
        const ingameReport = injector.resolve(IngameReport);
        
        manager.config = {} as any;
        manager.getModIdList.returns([]);
        const mods = ingameReport.getServerMods();
        expect(mods.length).to.equal(1);
        expect(mods).to.include(ingameReport.MOD_NAME);

        manager.getModIdList.returns([ingameReport.EXPANSION_VEHICLES_MOD_ID]);

        const expansionMods = ingameReport.getServerMods();
        expect(expansionMods.length).to.equal(2);
        expect(expansionMods).to.include(ingameReport.MOD_NAME);
        expect(expansionMods).to.include(ingameReport.MOD_NAME_EXPANSION);

    });

});
