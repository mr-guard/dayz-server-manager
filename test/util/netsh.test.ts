import { expect } from '../expect';
import { NetSH } from '../../src/util/netsh';
import { Logger, LogLevel } from '../../src/util/logger';
import { Paths } from '../../src/util/paths';
import { Processes } from '../../src/util/processes';
import { ImportMock } from 'ts-mock-imports';
import * as Sinon from 'sinon';

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

    beforeEach(() => {
        // restore mocks
        ImportMock.restore();
    });

    it('NetSH-addRule', async () => {
        const path = 'test/1234/asdf';

        const netSH = new NetSH();
        const processStub = Sinon.stub(netSH['processes'], 'spawnForOutput');

        await netSH.addRule(path);

        expect(processStub.callCount).to.equal(1);
        expect(processStub.firstCall.args[1]).to.include(path);
    });

    it('NetSH-getAllRules', async () => {
        const netSH = new NetSH();
        const processStub = Sinon.stub(netSH['processes'], 'spawnForOutput');

        processStub.returns(Promise.resolve({
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
        const netSH = new NetSH();
        const processStub = Sinon.stub(netSH['processes'], 'spawnForOutput');

        processStub.returns(Promise.resolve({
            status: 0,
            stderr: '',
            stdout: DAYZ_NETSH_RULE,
        }));

        const resultFound = await netSH.getRulesByPath('C:\\Windows\\system32\\svchost.exe');
        const resultNotFound = await netSH.getRulesByPath('C:\\test\\svchost.exe');

        // Expect result
        expect(resultFound.length).to.equal(1);
        expect(resultFound[0].Remoteport).to.equal('2302');
        expect(resultFound[0].Programm).to.equal('C:\\Windows\\system32\\svchost.exe');
        expect(resultNotFound).to.be.empty;
    });

});
