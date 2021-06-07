import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { disableConsole, enableConsole } from '../util';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import { IngameReport } from '../../src/services/ingame-report';

describe('Test class IngameReport', () => {

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

    it('IngameReport-processReport', async () => {

        const manager = {
            metrics: {
                pushMetricValue: sinon.stub(),
            },
        };
        
        const ingameReport = new IngameReport(manager as any);
        
        await ingameReport.processIngameReport({
            players: [],
            vehicles: [],
        });
        
        expect(manager.metrics.pushMetricValue.callCount).to.equal(2);

    });

    it('IngameReport-installMod', async () => {

        const manager = {
            getServerPath: () => 'testserver',
        };
        
        const ingameReport = new IngameReport(manager as any);
        
        ImportMock.mockFunction(fs, 'readdirSync', [ingameReport.MOD_NAME]);
        ImportMock.mockFunction(fs, 'existsSync', true);
        const removeLinkStub = sinon.stub(ingameReport['paths'], 'removeLink');
        removeLinkStub.returns(true);
        const copyStub = sinon.stub(ingameReport['paths'], 'copyFromPkg');

        await ingameReport.installMod();
        
        expect(removeLinkStub.callCount).to.equal(1);
        expect(copyStub.callCount).to.equal(1);

    });

    it('IngameReport-getMods', async () => {

        const manager = {
            config: {
                steamWsMods: [],
            },
        };

        const ingameReport = new IngameReport(manager as any);

        const mods = ingameReport.getServerMods();
        expect(mods.length).to.equal(1);
        expect(mods).to.include(ingameReport.MOD_NAME);

        manager.config.steamWsMods.push(ingameReport.EXPANSION_VEHICLES_MOD_ID);

        const expansionMods = ingameReport.getServerMods();
        expect(expansionMods.length).to.equal(2);
        expect(expansionMods).to.include(ingameReport.MOD_NAME);
        expect(expansionMods).to.include(ingameReport.MOD_NAME_EXPANSION);

    });

});
