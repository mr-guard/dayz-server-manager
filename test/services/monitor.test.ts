import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { StubInstance, disableConsole, enableConsole, fakeChildProcess, memfs, sleep, stubClass } from '../util';
import { Monitor } from '../../src/services/monitor';
import { SystemReporter } from '../../src/services/system-reporter';
import { ServerDetector } from '../../src/services/server-detector';
import { ServerStarter } from '../../src/services/server-starter';
import * as sinon from 'sinon';
import { merge } from '../../src/util/merge';
import { Processes, SystemInfo } from '../../src/services/processes';
import { ServerState } from '../../src/types/monitor';
import * as childProcess from 'child_process';
import { DependencyContainer, Lifecycle, container } from 'tsyringe';
import { Manager } from '../../src/control/manager';
import { DiscordBot } from '../../src/services/discord';
import { FSAPI } from '../../src/util/apis';
import { RCON } from '../../src/services/rcon';
import { SteamCMD } from '../../src/services/steamcmd';
import { IngameReport } from '../../src/services/ingame-report';
import { Hooks } from '../../src/services/hooks';
import { EventBus } from '../../src/control/event-bus';
import { InternalEventTypes } from '../../src/types/events';
import { Paths } from '../../src/services/paths';

describe('Test class ServerDetector', () => {

    let injector: DependencyContainer;

    let manager: StubInstance<Manager>;
    let processes: StubInstance<Processes>;

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
        injector.register(Processes, stubClass(Processes), { lifecycle: Lifecycle.Singleton });
        
        manager = injector.resolve(Manager) as any;
        processes = injector.resolve(Processes) as any;

    });

    it('ServerDetector-getProcesses', async () => {
        processes.getProcessList.resolves([{
            Name: 'DayZ',
            ProcessId: '1234',
            ExecutablePath: 'test/DayZServer_x64.exe',
            CommandLine: 'DayZServer_x64 some arg',
            PrivatePageCount: '1234',
            CreationDate: '20210604142624',
            UserModeTime: '123456',
            KernelModeTime: '123456',
        }] as any);
        
        manager.getServerExePath.returns('test/DayZServer_x64.exe');
        
        const detector = injector.resolve(ServerDetector);

        const res = await detector.getDayZProcesses();
        const isRunning = await detector.isServerRunning();

        expect(res.length).to.equal(1);
        expect(isRunning).to.be.true;
        expect(res[0].CreationDate).to.equal('2021-06-04 14:26:24');
    });

    it('ServerDetector-serverNotRunning', async () => {
        processes.getProcessList.resolves([]);
        
        manager.getServerExePath.returns('test/DayZServer_x64.exe');
        
        const detector = injector.resolve(ServerDetector);

        const isRunning = await detector.isServerRunning();

        expect(isRunning).to.be.false;
    });

});

describe('Test class ServerStarter', () => {

    let injector: DependencyContainer;

    let manager: StubInstance<Manager>;
    let processes: StubInstance<Processes>;
    let serverDetector: StubInstance<ServerDetector>;
    let rcon: StubInstance<RCON>;
    let steamCmd: StubInstance<SteamCMD>;
    let ingameReport: StubInstance<IngameReport>;
    let hooks: StubInstance<Hooks>;
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
        injector.register(Processes, stubClass(Processes), { lifecycle: Lifecycle.Singleton });
        injector.register(ServerDetector, stubClass(ServerDetector), { lifecycle: Lifecycle.Singleton });
        injector.register(RCON, stubClass(RCON), { lifecycle: Lifecycle.Singleton });
        injector.register(SteamCMD, stubClass(SteamCMD), { lifecycle: Lifecycle.Singleton });
        injector.register(IngameReport, stubClass(IngameReport), { lifecycle: Lifecycle.Singleton });
        injector.register(Hooks, stubClass(Hooks), { lifecycle: Lifecycle.Singleton });
        
        fs = memfs({}, '/', injector);

        manager = injector.resolve(Manager) as any;
        processes = injector.resolve(Processes) as any;
        serverDetector = injector.resolve(ServerDetector) as any;
        rcon = injector.resolve(RCON) as any;
        steamCmd = injector.resolve(SteamCMD) as any;
        ingameReport = injector.resolve(IngameReport) as any;
        hooks = injector.resolve(Hooks) as any;

    });

    it('ServerStarter-killServer', async () => {
        const starter = injector.resolve(ServerStarter);

        serverDetector.getDayZProcesses.resolves([{
            Name: 'DayZ',
            ProcessId: '42',
            ExecutablePath: 'test/DayZServer_x64.exe',
            CommandLine: 'DayZServer_x64 some arg',
            PrivatePageCount: '1234',
            CreationDate: '20210604142624',
            UserModeTime: '123456',
            KernelModeTime: '123456',
        }]);

        const res = await starter.killServer(true);
        
        expect(res).to.be.true;
        expect(processes.killProcess.callCount).to.equal(1);
        expect(processes.killProcess.firstCall.firstArg).to.equal('42');
    });

    it('ServerStarter-killServer-rcon', async () => {
        const starter = injector.resolve(ServerStarter);

        manager.config = {
            useRconToRestart: true,
        } as any;

        rcon.isConnected.returns(true);
        rcon.shutdown.resolves();

        const res = await starter.killServer();
        
        expect(res).to.be.true;
        expect(rcon.shutdown.callCount).to.equal(1);
    });

    it('ServerStarter-startServer', async () => {

        const spawnMock = ImportMock.mockFunction(childProcess, 'spawn').returns({
            on: (t, r) => {
                if (t === 'exit') r(0);
            },
            unref: sinon.stub(),
        });


        steamCmd.checkServer.callsFake(async () => {
            // server should be ok after update
            return steamCmd.updateServer.called;
        });
        steamCmd.updateServer.callsFake(async () => {
            // only return true when checked for updates before
            return steamCmd.checkServer.called;
        });
        
        steamCmd.checkMods.callsFake(async () => {
            // mods should be ok after update
            return steamCmd.updateAllMods.called;
        });
        steamCmd.updateAllMods.callsFake(async () => {
            // should check before updating
            return steamCmd.checkMods.called;
        });
        steamCmd.installMods.resolves(true);
        steamCmd.buildWsModParams.returns([]);
        
        fs = memfs(
            {
                'testPath': {}
            },
            '/',
            injector,
        );
        manager.getServerPath.returns('/testPath');
        manager.getWebPort.returns(4321);
        manager.config = {
            serverExe: 'testExe',
            serverCfgPath: 'test.cfg',
            serverPort: 1234,
            profilesPath: 'profs',
            localMods: ['@test','@test2'],
            serverCfg: {
                hostname: 'test'
            },

            adminLog: true,
            doLogs: true,
            filePatching: true,
            freezeCheck: true,
            limitFPS: 30,
            cpuCount: 2,
            netLog: true,
            scrAllowFileWrite: true,
            scriptDebug: true,
        } as any;
        
        ingameReport.getServerMods.returns(['@DZSM']);

        const starter = injector.resolve(ServerStarter);

        const res = await starter.startServer();

        expect(res).to.be.true;
        expect(steamCmd.checkServer.called).to.be.true;
        expect(steamCmd.updateServer.called).to.be.true;
        expect(steamCmd.checkMods.called).to.be.true;
        expect(steamCmd.updateAllMods.called).to.be.true;
        expect(spawnMock.callCount).to.equal(1);
        
        for (const argName of [
            'adminLog',
            'doLogs',
            'filePatching',
            'freezeCheck',
            'limitFPS',
            'cpuCount',
            'netLog',
            'scrAllowFileWrite',
            'scriptDebug',
        ]) {
            expect(
                spawnMock.firstCall.args[1]
                    .some((callArg: string) => {
                        return callArg
                            .toLowerCase()
                            .includes(
                                argName.toLowerCase(),
                            );
                    }),
                `Expect callArgs to include ${argName}`,
            ).to.be.true;
        }
        
    });

});

describe('Test class Monitor', () => {

    let injector: DependencyContainer;

    let manager: StubInstance<Manager>;
    let processes: StubInstance<Processes>;
    let eventBus: EventBus;
    let serverStarter: StubInstance<ServerStarter>;
    let serverDetector: StubInstance<ServerDetector>;
    let fs: FSAPI;
    let paths: Paths;


    before(() => {
        // disableConsole();
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
        injector.register(DiscordBot, stubClass(DiscordBot), { lifecycle: Lifecycle.Singleton });
        injector.register(Processes, stubClass(Processes), { lifecycle: Lifecycle.Singleton });
        injector.register(ServerStarter, stubClass(ServerStarter), { lifecycle: Lifecycle.Singleton });
        injector.register(ServerDetector, stubClass(ServerDetector), { lifecycle: Lifecycle.Singleton });
        injector.register(EventBus, EventBus, { lifecycle: Lifecycle.Singleton });
        injector.register(Paths, Paths, { lifecycle: Lifecycle.Singleton });
        fakeChildProcess(injector); // for paths

        fs = memfs({}, '/', injector);

        manager = injector.resolve(Manager) as any;
        processes = injector.resolve(Processes) as any;
        eventBus = injector.resolve(EventBus) as any;
        serverStarter = injector.resolve(ServerStarter) as any;
        serverDetector = injector.resolve(ServerDetector) as any;
        paths = injector.resolve(Paths);
    });

    it('Monitor-startStop', async () => {
    
        manager.getServerPath.returns('/test');
        
        manager.config = {
            serverProcessPollIntervall: 1,
        } as any;

        const monitor = injector.resolve(Monitor);
        monitor.loopInterval = 1;

        serverDetector.isServerRunning.resolves(false);

        
        await monitor.start();

        // await tick
        await new Promise((r) => setTimeout(r, 25));

        await monitor.stop();    
        
        expect(serverStarter.startServer.callCount).to.equal(1);
    });

    it('Monitor-startAlreadyRunning', async () => {
    
        manager.getServerPath.returns('/test');
        
        manager.config = {
            serverProcessPollIntervall: 10,
        } as any;

        const monitor = injector.resolve(Monitor);
        monitor.loopInterval = 1;

        serverDetector.getDayZProcesses.resolves([]);
        serverDetector.isServerRunning.resolves(true);
    
        await monitor.start();

        // await tick
        await new Promise((r) => setTimeout(r, 10));

        await monitor.stop();    
        
        expect(serverDetector.isServerRunning.callCount).to.be.greaterThan(0);
        expect(serverStarter.startServer.callCount).to.equal(0);
    });

    it('Monitor-restartLock', async () => {
    
        manager.getServerPath.returns('/test');
        
        manager.config = {
            serverProcessPollIntervall: 1,
        } as any;

        const monitor = injector.resolve(Monitor);
        monitor.loopInterval = 1;

        serverDetector.isServerRunning.resolves(false);

        monitor.restartLock = true;
        await monitor.start();

        await new Promise((r) => setTimeout(r, 10));
        
        await monitor.stop();
        
        expect(serverDetector.isServerRunning.callCount).to.be.greaterThan(0);
        expect(serverStarter.startServer.callCount).to.equal(0);
        
    });

    it('Monitor-stateChange', async () => {
        
        const monitor = injector.resolve(Monitor);
        
        // mock started server
        monitor['$internalServerState'] = ServerState.STARTED;
        
        // register a listener
        let listenerCalled = false;
        const stateListener = eventBus.on(
            InternalEventTypes.MONITOR_STATE_CHANGE,
            async (s) => listenerCalled = true,
        );

        // trigger change
        monitor['internalServerState'] = ServerState.STOPPED;

        // await async listeners
        await sleep(10);

        expect(monitor.serverState).to.equal(ServerState.STOPPED);
        expect(listenerCalled).to.be.true;

        // test correct removal
        listenerCalled = false;
        stateListener.off();
        
        monitor['internalServerState'] = ServerState.STARTED;

        // await async listeners
        await sleep(10);

        expect(monitor.serverState).to.equal(ServerState.STARTED);
        expect(listenerCalled).to.be.false;
    });

    it('Monitor-kill', async () => {
        const monitor = injector.resolve(Monitor);

        monitor['$internalServerState'] = ServerState.STARTED;
        await monitor.killServer(true);

        expect(monitor['$internalServerState']).to.equal(ServerState.STOPPING);
        expect(serverStarter.killServer.callCount).to.equal(1);
    });

    it('Monitor-stuckstate', async () => {

        let emitted = 0;
        eventBus.on(InternalEventTypes.DISCORD_MESSAGE, async () => emitted++);

        serverDetector.getDayZProcesses.resolves([{
            UserModeTime: `${100 * 10000}`,
            KernelModeTime: `${100 * 10000}`,
        } as any]);
        processes.getProcessCPUSpent.returns(100);

        const monitor = injector.resolve(Monitor);

        for (let i = 1; i <= 5; i++) {
            const res = await monitor.checkPossibleStuckState();
        
            expect(res).to.equal(i === 5);
        }
        
        // discord msg is triggered async
        await new Promise((r) => setTimeout(r, 10));
        expect(emitted).to.equal(1);

    });

});

describe('Test class SystemReporter', () => {

    let injector: DependencyContainer;

    let monitor: StubInstance<Monitor>;
    let processes: StubInstance<Processes>;
    let serverDetector: StubInstance<ServerDetector>;

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

        injector.register(Monitor, stubClass(Monitor), { lifecycle: Lifecycle.Singleton });
        injector.register(Processes, stubClass(Processes), { lifecycle: Lifecycle.Singleton });
        injector.register(ServerDetector, stubClass(ServerDetector), { lifecycle: Lifecycle.Singleton });

        monitor = injector.resolve(Monitor) as any;
        processes = injector.resolve(Processes) as any;
        serverDetector = injector.resolve(ServerDetector) as any;
    });

    it('SystemReport', async () => {
        const reporter = injector.resolve(SystemReporter);

        processes.getSystemUsage.returns(
            merge(new SystemInfo(), {
                cpu: [{
                    model: 'some-cpu',
                    speed: 4,
                    times: {
                        user: 1234,
                        nice: 1234,
                        sys: 1234,
                        idle: 1234,
                        irq: 1234,
                    },
                }],
                avgLoad: [0.5],
                memTotal: 16 * 1024 * 1024,
                memFree: 8 * 1024 * 1024,
                uptime: 123456789,
            })
        );

        serverDetector.getDayZProcesses.resolves([{
            Name: 'DayZ',
            ProcessId: '1234',
            ExecutablePath: 'test/DayZServer_x64.exe',
            CommandLine: 'DayZServer_x64 some arg',
            PrivatePageCount: '1234',
            CreationDate: '20210604142624',
            UserModeTime: '123456',
            KernelModeTime: '123456',
        }]);

        (monitor as any).serverState = ServerState.STARTED;

        const res = await reporter.getSystemReport();

        expect(res).to.be.not.undefined;
        expect(res?.server).to.be.not.undefined;

    });

    

});
