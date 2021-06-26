import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { disableConsole, enableConsole } from '../util';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import { Requirements } from '../../src/services/requirements';

describe('Test class Requirements', () => {

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

    it('Requirements-checkFirewall', async () => {
        const manager = {
            getServerExePath: () => 'testserver/server.exe',
        } as any;

        const requirements = new Requirements(manager);

        let rulesStub = sinon.stub(requirements['netSh'], 'getRulesByPath');
        rulesStub.withArgs(path.resolve('testserver/server.exe'))
            .returns(Promise.resolve([]));

        const resNotFound = await requirements.checkFirewall();
        expect(resNotFound).to.be.false;
        
        rulesStub.restore();
        rulesStub = sinon.stub(requirements['netSh'], 'getRulesByPath');
        rulesStub.withArgs(path.resolve('testserver/server.exe'))
            .returns(Promise.resolve([{
                test: 'test'
            }]))
        const res = await requirements.checkFirewall();
        expect(res).to.be.true;
    });


    it('Requirements-checkDirectX', async () => {
        const requirements = new Requirements(null);

        let existsStub = ImportMock.mockFunction(fs, 'existsSync', false);

        const resNotFound = await requirements.checkDirectX();
        expect(resNotFound).to.be.false;

        existsStub.restore();
        existsStub = ImportMock.mockFunction(fs, 'existsSync', true)
        const res = await requirements.checkDirectX();
        expect(res).to.be.true;
    });

    it('Requirements-checkVCRedist', async () => {
        const requirements = new Requirements(null);

        let existsStub = ImportMock.mockFunction(fs, 'existsSync', false);

        const resNotFound = await requirements.checkVcRedist();
        expect(resNotFound).to.be.false;

        existsStub.restore();
        existsStub = ImportMock.mockFunction(fs, 'existsSync', true)
        const res = await requirements.checkVcRedist();
        expect(res).to.be.true;
    });

    it('Requirements-checkWinErrReporting', async () => {
        const requirements = new Requirements(null);

        ImportMock.mockFunction(fs, 'writeFileSync');

        let processesStub = sinon.stub(requirements['processes'], 'spawnForOutput');
        processesStub.returns(Promise.resolve({
                status: 0,
                stderr: '',
                stdout: '0x0', // marker for enabled
            }));

        const resNotFound = await requirements.checkWinErrorReporting();
        expect(resNotFound).to.be.false;

        processesStub.restore();
        processesStub = sinon.stub(requirements['processes'], 'spawnForOutput');
        processesStub.returns(Promise.resolve({
                status: 0,
                stderr: '',
                stdout: '0x1', // marker for disabled
            }))
        const res = await requirements.checkWinErrorReporting();
        expect(res).to.be.true;
    });

});
