import 'reflect-metadata';

import { expect } from '../expect';
import { StubInstance, disableConsole, enableConsole, memfs, stub, stubClass } from '../util';
import * as sinon from 'sinon';
import * as path from 'path';
import { Requirements } from '../../src/services/requirements';
import { Processes } from '../../src/services/processes';
import { NetSH } from '../../src/services/netsh';
import { DependencyContainer, container } from 'tsyringe';
import { FSAPI } from '../../src/util/apis';
import { Manager } from '../../src/control/manager';

describe('Test class Requirements', () => {

    let injector: DependencyContainer;

    let manager: StubInstance<Manager>;
    let processes: StubInstance<Processes>;
    let netSh: StubInstance<NetSH>;
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
        injector.register(Manager, stubClass(Manager));
        injector.register(NetSH, stubClass(NetSH));
        injector.register(Processes, stubClass(Processes));

        fs = memfs(undefined, undefined, injector);
        // make sure pwd exists
        fs.mkdirSync('', { recursive: true })
        
        netSh = injector.resolve(NetSH) as any;
        
        processes = injector.resolve(Processes) as any;

        manager = injector.resolve(Manager) as any;
        manager.getServerExePath.returns('testserver/server.exe');
    });

    it('Requirements-checkFirewall-Rulesabsent', async () => {
        netSh.getRulesByPath
            .withArgs(path.resolve('testserver/server.exe'))
            .returns(Promise.resolve([]));

        const requirements = injector.resolve(Requirements);
        
        const resNotFound = await requirements.checkFirewall();
        expect(resNotFound).to.be.false;
    });

    it('Requirements-checkFirewall-RulesPresent', async () => {
        netSh.getRulesByPath
            .withArgs(path.resolve('testserver/server.exe'))
            .returns(Promise.resolve([{
                test: 'test'
            }]));

        const requirements = injector.resolve(Requirements);

        const res = await requirements.checkFirewall();
        expect(res).to.be.true;
    });


    it('Requirements-checkDirectX-Absent', async () => {
        const requirements = injector.resolve(Requirements);

        const resNotFound = await requirements.checkDirectX();
        expect(resNotFound).to.be.false;
    });

    it('Requirements-checkDirectX-Present', async () => {
        const existsStub = sinon.stub(fs, 'existsSync').returns(true);
        const requirements = injector.resolve(Requirements);
        
        const res = await requirements.checkDirectX();
        expect(res).to.be.true;
        expect(existsStub.called).to.be.true;
    });

    it('Requirements-checkVCRedist-Absent', async () => {
        const requirements = injector.resolve(Requirements);

        const resNotFound = await requirements.checkVcRedist();
        expect(resNotFound).to.be.false;
    });

    it('Requirements-checkVCRedist-Present', async () => {
        const requirements = injector.resolve(Requirements);

        const existsStub = sinon.stub(fs, 'existsSync').returns(true);

        const res = await requirements.checkVcRedist();
        expect(res).to.be.true;
        expect(existsStub.called).to.be.true;
    });

    it('Requirements-checkWinErrReporting-Absent', async () => {
        processes.spawnForOutput
            .resolves({
                status: 0,
                stderr: '',
                stdout: '0x0', // marker for enabled
            });
            
        const requirements = injector.resolve(Requirements);

        const resNotFound = await requirements.checkWinErrorReporting();
        expect(resNotFound).to.be.false;
    });

    it('Requirements-checkWinErrReporting-Present', async () => {
        processes.spawnForOutput.resolves({
            status: 0,
            stderr: '',
            stdout: '0x1', // marker for disabled
        });
        
        const requirements = injector.resolve(Requirements);

        const res = await requirements.checkWinErrorReporting();
        expect(res).to.be.true;
    });

    it('Requirements-checkRuntimeLibs', async () => {
        const requirements = injector.resolve(Requirements);

        sinon.stub(requirements, 'checkVcRedist').resolves(true);
        sinon.stub(requirements, 'checkDirectX').resolves(true);
        
        const res = await requirements.checkRuntimeLibs();
        expect(res).to.be.true;
    });

    it('Requirements-checkOptionals', async () => {
        const requirements = injector.resolve(Requirements);

        sinon.stub(requirements, 'checkWinErrorReporting').resolves(true);
        
        const res = await requirements.checkOptionals();
        expect(res).to.be.true;
    });

    it('Requirements-checkLinuxLib-Present', async () => {
        processes.spawnForOutput.resolves({
            status: 0,
            stderr: '',
            stdout: 'Present',
        });
        const requirements = injector.resolve(Requirements);

        const res = await requirements.isLinuxLibPresent('test');
        expect(res).to.be.true;
    });
    
    it('Requirements-checkLinuxLib-Absent', async () => {
        processes.spawnForOutput.resolves({
            status: 0,
            stderr: '',
            stdout: '',
        });
        const requirements = injector.resolve(Requirements);

        const res = await requirements.isLinuxLibPresent('test');
        expect(res).to.be.false;
    });

    it('Requirements-check-exitMissingLib', async () => {
        const exitMock = processes.exit;
        const requirements = injector.resolve(Requirements);

        sinon.stub(requirements, 'checkFirewall').returns(Promise.resolve(true));
        sinon.stub(requirements, 'checkOptionals').returns(Promise.resolve(true));
        
        // expect process exit when libs are missing
        sinon.stub(requirements, 'checkRuntimeLibs').returns(Promise.resolve(false));

        await requirements.check();
        
        expect(exitMock.called).to.be.true;
    });

});
