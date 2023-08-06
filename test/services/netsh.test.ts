import 'reflect-metadata';

import { expect } from '../expect';
import { NetSH } from '../../src/services/netsh';
import * as sinon from 'sinon';
import { DependencyContainer, container } from 'tsyringe';
import { LoggerFactory } from '../../src/services/loggerfactory';
import { Processes } from '../../src/services/processes';
import { Paths } from '../../src/services/paths';
import { StubInstance, stubClass } from '../util';

export const DAYZ_NETSH_RULE = `

Regelname:                               DayZ
----------------------------------------------------------------------
Beschreibung:                            CUT
Aktiviert:                               Ja
Richtung:                                Aus
Profile:                                 Domäne,Privat,Öffentlich
Gruppierung:                             CUt
Lokales IP:                              Beliebig
Remote-IP:                               Beliebig
Protokoll:                               UDP
Lokaler Port:                            Beliebig
Remoteport:                              2302
Edgeausnahme:                            CUt
Programm:                                C:\\Windows\\system32\\svchost.exe
Dienst:                                  CUT
Schnittstellentypen:                     CUT
Sicherheit:                              CUT
Regelquelle:                             CUT
Aktion:                                  Zulassen

`;


describe('Test class NetSH', () => {

    let injector: DependencyContainer;

    let processes: StubInstance<Processes>;
    let paths: StubInstance<Paths>;

    beforeEach(() => {
        container.reset();
        injector = container.createChildContainer();
        injector.register(LoggerFactory, LoggerFactory);
        injector.register(Processes, stubClass(Processes));
        injector.register(Paths, stubClass(Paths));

        processes = injector.resolve(Processes) as any;
        paths = injector.resolve(Paths) as any;
    });

    it('NetSH-addRule', async () => {
        const path = 'test/1234/asdf';

        const netSH = injector.resolve(NetSH);

        await netSH.addRule(path);

        expect(processes.spawnForOutput.callCount).to.equal(1);
        expect(processes.spawnForOutput.firstCall.args[1]).to.include(path);
    });

    it('NetSH-getAllRules', async () => {
        const netSH = injector.resolve(NetSH);
        processes.spawnForOutput.returns(Promise.resolve({
            status: 0,
            stderr: '',
            stdout: DAYZ_NETSH_RULE,
        }));

        const result = await netSH.getAllRules();

        // Expect result
        expect(result.length).to.equal(1);
        expect(result[0].Remoteport).to.equal('2302');
        expect(result[0].Programm).to.equal('C:\\Windows\\system32\\svchost.exe');

    });

    it('NetSH-getRulesByPath', async () => {
        const netSH = injector.resolve(NetSH);

        processes.spawnForOutput.returns(Promise.resolve({
            status: 0,
            stderr: '',
            stdout: DAYZ_NETSH_RULE,
        }));

        paths.samePath
            .returns(false)
        paths.samePath
            .withArgs('C:\\Windows\\system32\\svchost.exe', 'C:\\Windows\\system32\\svchost.exe')
            .returns(true)

        const resultFound = await netSH.getRulesByPath('C:\\Windows\\system32\\svchost.exe');
        const resultNotFound = await netSH.getRulesByPath('C:\\test\\svchost.exe');

        // Expect result
        expect(resultFound.length).to.equal(1);
        expect(resultFound[0].Remoteport).to.equal('2302');
        expect(resultFound[0].Programm).to.equal('C:\\Windows\\system32\\svchost.exe');
        expect(resultNotFound).to.be.empty;
    });

});
