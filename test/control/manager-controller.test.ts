import 'reflect-metadata';
import * as Sinon from 'sinon';
import * as fs from 'fs';
import { ImportMock } from 'ts-mock-imports';
import { ManagerController } from '../../src/control/manager-controller';
import { VALID_CONFIG } from '../config/config-validate.test';
import { disableConsole, enableConsole } from '../util';
import { Manager } from '../../src/control/manager';
import { expect } from '../expect';

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

class TestIngameReport {
    public constructor(public manager: Manager) {}
    
    public async installMod(): Promise<boolean> {
        return true;
    }    
}


describe('Test class ManagerController', () => {

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

    it('ManagerController', async () => {
        ImportMock.mockFunction(fs, 'existsSync', true);
        ImportMock.mockFunction(fs, 'readFileSync', VALID_CONFIG);
        const reflectMock = ImportMock.mockFunction(Reflect, 'getMetadata');
        reflectMock.withArgs('services', Sinon.match.any).returns([
            'steamCmd',
            'monitor',
            'requirements',
            'ingameReport',
        ]);
        reflectMock.withArgs('service', Sinon.match.any, 'steamCmd').returns({
            type: TestSteamCmd,
            stateful: false,
        });
        reflectMock.withArgs('service', Sinon.match.any, 'monitor').returns({
            type: TestMonitor,
            stateful: true,
        });
        reflectMock.withArgs('service', Sinon.match.any, 'requirements').returns({
            type: TestRequirements,
            stateful: false,
        });
        reflectMock.withArgs('service', Sinon.match.any, 'ingameReport').returns({
            type: TestIngameReport,
            stateful: false,
        });


        await ManagerController.INSTANCE.start();
        const testMonitor = (ManagerController.INSTANCE['manager'].monitor as any as TestMonitor);
        expect(testMonitor.startCalled).to.be.true;

        await ManagerController.INSTANCE.stop();
        expect(testMonitor.stopCalled).to.be.true;

    });
});