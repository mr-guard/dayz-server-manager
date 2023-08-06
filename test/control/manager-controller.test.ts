import 'reflect-metadata';

import * as sinon from 'sinon';
import { ImportMock } from 'ts-mock-imports';
import { ManagerController } from '../../src/control/manager-controller';
import { VALID_CONFIG } from '../config/config-validate.test';
import { StubInstance, disableConsole, enableConsole, stubClass } from '../util';
import { Manager } from '../../src/control/manager';
import { expect } from '../expect';
import { DependencyContainer, Lifecycle, container, injectable, singleton } from 'tsyringe';
import { ConfigWatcher } from '../../src/services/config-watcher';
import { ServerDetector } from '../../src/services/server-detector';
import { SteamCMD } from '../../src/services/steamcmd';
import { IngameReport } from '../../src/services/ingame-report';
import { Requirements } from '../../src/services/requirements';
import { IStatefulService } from '../../src/types/service';
import { Config } from '../../src/config/config';

class TestMonitor {
    public startCalled = false;
    public stopCalled = false;
    public constructor(public manager: Manager) {}
    
    public async start(): Promise<void> {
        this.startCalled = true;
    }
    public async stop(): Promise<void> {
        this.stopCalled = true;
    }
    public async getDayZProcesses() {
        return [];
    }
    public async isServerRunning() {
        return false;
    }
}

class TestRequirements {
    public constructor(public manager: Manager) {}
    
    public async checkFirewall(): Promise<boolean> {
        return true;
    }
    public async checkDirectX(): Promise<boolean> {
        return true;
    }
    public async checkVcRedist(): Promise<boolean> {
        return true;
    }
    public async checkWinErrorReporting(): Promise<boolean> {
        return true;
    }    
}

class TestSteamCmd {
    public constructor(public manager: Manager) {}
    
    public async checkMods(): Promise<boolean> {
        return true;
    }
    public async updateMods(): Promise<boolean> {
        return true;
    }
    public async installMods(): Promise<boolean> {
        return true;
    }
    public async checkServer(): Promise<boolean> {
        return true;
    }
    public async updateServer(): Promise<boolean> {
        return true;
    }
    public async checkSteamCmd(): Promise<boolean> {
        return true;
    }

}

export class TestStateful extends IStatefulService {
    public start = sinon.stub();
    public stop = sinon.stub();
    
    public constructor() {
        super(undefined!);
    }
}


describe('Test class ManagerController', () => {

    let injector: DependencyContainer;

    let configWatcher: StubInstance<ConfigWatcher>;
    let manager: StubInstance<Manager>;
    let serverDetector: StubInstance<ServerDetector>;
    let steamCmd: StubInstance<SteamCMD>;
    let ingameReport: StubInstance<IngameReport>;
    let requirements: StubInstance<Requirements>;

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

        injector.register(ConfigWatcher, stubClass(ConfigWatcher), { lifecycle: Lifecycle.Singleton });
        injector.register(Manager, stubClass(Manager), { lifecycle: Lifecycle.Singleton });
        injector.register(ServerDetector, stubClass(ServerDetector), { lifecycle: Lifecycle.Singleton });
        injector.register(SteamCMD, stubClass(SteamCMD), { lifecycle: Lifecycle.Singleton });
        injector.register(IngameReport, stubClass(IngameReport), { lifecycle: Lifecycle.Singleton });
        injector.register(Requirements, stubClass(Requirements), { lifecycle: Lifecycle.Singleton });
        
        configWatcher = injector.resolve(ConfigWatcher) as any;
        manager = injector.resolve(Manager) as any;
        serverDetector = injector.resolve(ServerDetector) as any;
        steamCmd = injector.resolve(SteamCMD) as any;
        ingameReport = injector.resolve(IngameReport) as any;
        requirements = injector.resolve(Requirements) as any;
    });

    it('ManagerController', async () => {

        container.register(TestStateful, TestStateful, { lifecycle: Lifecycle.Singleton });
        const testStateful = container.resolve(TestStateful);

        configWatcher.watch.resolves(new Config());

        steamCmd.checkSteamCmd.resolves(true);
        steamCmd.checkServer.resolves(true);
        steamCmd.checkMods.resolves(true);
        steamCmd.installMods.resolves(true);

        const controller = injector.resolve(ManagerController);
        await controller.start();
        
        expect(testStateful.start.called).to.be.true;
        expect(manager.initDone).to.be.true;

        expect(steamCmd.checkSteamCmd.called).to.be.true;
        expect(steamCmd.checkServer.called).to.be.true;
        expect(steamCmd.checkMods.called).to.be.true;
        expect(steamCmd.installMods.called).to.be.true;
        
        await controller.stop();

        expect(testStateful.stop.called).to.be.true;
        expect(manager.initDone).to.be.false;
        
    });
});