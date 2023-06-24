import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { disableConsole, enableConsole } from '../util';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import { Requirements } from '../../src/services/requirements';
import { Logger } from '../../src/util/logger';
import { Processes } from '../../src/util/processes';
import { NetSH } from '../../src/util/netsh';

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

    it('Requirements-checkFirewall-Rulesabsent', async () => {
        const rulesStub = sinon.stub()
            .withArgs(path.resolve('testserver/server.exe'))
            .returns(Promise.resolve([])) 
        const netSh = {
            getRulesByPath: rulesStub 
        } as Partial<NetSH>;

        const requirements = new Requirements(
            'testserver/server.exe',
            undefined as any as Logger,
            netSh as any as NetSH,
            undefined as any as Processes,
        );
        
        const resNotFound = await requirements.checkFirewall();
        expect(resNotFound).to.be.false;
    });

    it('Requirements-checkFirewall-RulesPresent', async () => {
        const rulesStub = sinon.stub()
            .withArgs(path.resolve('testserver/server.exe'))
            .returns(Promise.resolve([{
                test: 'test'
            }]));
        
        const netSh = {
            getRulesByPath: rulesStub 
        } as Partial<NetSH>;

        const requirements = new Requirements(
            'testserver/server.exe',
            undefined as any as Logger,
            netSh as any as NetSH,
            undefined as any as Processes,
        );

        const res = await requirements.checkFirewall();
        expect(res).to.be.true;
    });


    it('Requirements-checkDirectX-Absent', async () => {
        const requirements = new Requirements('');

        const existsStub = ImportMock.mockFunction(fs, 'existsSync', false);

        const resNotFound = await requirements.checkDirectX();
        expect(resNotFound).to.be.false;
        expect(existsStub.called).to.be.true;
    });

    it('Requirements-checkDirectX-Present', async () => {
        const requirements = new Requirements('');

        const existsStub = ImportMock.mockFunction(fs, 'existsSync', true);

        const res = await requirements.checkDirectX();
        expect(res).to.be.true;
        expect(existsStub.called).to.be.true;
    });

    it('Requirements-checkVCRedist-Absent', async () => {
        const requirements = new Requirements('');

        const existsStub = ImportMock.mockFunction(fs, 'existsSync', false);

        const resNotFound = await requirements.checkVcRedist();
        expect(resNotFound).to.be.false;
        expect(existsStub.called).to.be.true;
    });

    it('Requirements-checkVCRedist-Present', async () => {
        const requirements = new Requirements('');

        const existsStub = ImportMock.mockFunction(fs, 'existsSync', true);

        const res = await requirements.checkVcRedist();
        expect(res).to.be.true;
        expect(existsStub.called).to.be.true;
    });

    it('Requirements-checkWinErrReporting-Absent', async () => {
        const requirements = new Requirements('');

        ImportMock.mockFunction(fs, 'writeFileSync'); // prevent writing

        const processesStub = sinon.stub(requirements['processes'], 'spawnForOutput');
        processesStub.returns(Promise.resolve({
                status: 0,
                stderr: '',
                stdout: '0x0', // marker for enabled
            }));

        const resNotFound = await requirements.checkWinErrorReporting();
        expect(resNotFound).to.be.false;
    });

    it('Requirements-checkWinErrReporting-Present', async () => {
        const processesStub = {
            spawnForOutput: sinon.stub()
                .returns(Promise.resolve({
                    status: 0,
                    stderr: '',
                    stdout: '0x1', // marker for disabled
                }))
        } as Partial<Processes>;
        const requirements = new Requirements(
            '',
            undefined as any as Logger,
            undefined as any as NetSH,
            processesStub as any as Processes,
        );

        ImportMock.mockFunction(fs, 'writeFileSync'); // prevent writing

        const res = await requirements.checkWinErrorReporting();
        expect(res).to.be.true;
    });

    it('Requirements-checkRuntimeLibs', async () => {
        const requirements = new Requirements('');

        sinon.stub(requirements, 'checkVcRedist').returns(Promise.resolve(true));
        sinon.stub(requirements, 'checkDirectX').returns(Promise.resolve(true));
        
        const res = await requirements.checkRuntimeLibs();
        expect(res).to.be.true;
    });

    it('Requirements-checkOptionals', async () => {
        const requirements = new Requirements('');

        sinon.stub(requirements, 'checkWinErrorReporting').returns(Promise.resolve(true));
        
        const res = await requirements.checkOptionals();
        expect(res).to.be.true;
    });

    it('Requirements-checkLinuxLib-Present', async () => {
        const processesStub = {
            spawnForOutput: sinon.stub()
                .returns(Promise.resolve({
                    status: 0,
                    stderr: '',
                    stdout: 'Present',
                }))
        } as Partial<Processes>;
        const requirements = new Requirements(
            '',
            undefined as any as Logger,
            undefined as any as NetSH,
            processesStub as any as Processes,
        );

        const res = await requirements.isLinuxLibPresent('test');
        expect(res).to.be.true;
    });
    
    it('Requirements-checkLinuxLib-Absent', async () => {
        const processesStub = {
            spawnForOutput: sinon.stub()
                .returns(Promise.resolve({
                    status: 0,
                    stderr: '',
                    stdout: '',
                }))
        } as Partial<Processes>;
        const requirements = new Requirements(
            '',
            undefined as any as Logger,
            undefined as any as NetSH,
            processesStub as any as Processes,
        );

        const res = await requirements.isLinuxLibPresent('test');
        expect(res).to.be.false;
    });

    it('Requirements-check-exitMissingLib', async () => {
        const requirements = new Requirements('');

        sinon.stub(requirements, 'checkFirewall').returns(Promise.resolve(true));
        sinon.stub(requirements, 'checkOptionals').returns(Promise.resolve(true));
        sinon.stub(requirements, 'checkRuntimeLibs').returns(Promise.resolve(false));
        const exitMock = ImportMock.mockFunction(process, 'exit');

        await requirements.check();
        
        expect(exitMock.called).to.be.true;
    });

});
