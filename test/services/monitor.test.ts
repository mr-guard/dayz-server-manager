import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { disableConsole, enableConsole } from '../util';
import { Monitor, MonitorLoop } from '../../src/services/monitor';
import * as fs from 'fs';
import { merge } from '../../src/util/merge';
import { SystemInfo } from '../../src/util/processes';
import { ServerState } from '../../src/types/monitor';
import * as childProcess from 'child_process';

describe('Test class Monitor', () => {

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

    it('Monitor-startStop', async () => {
    
        
        const monitor = new Monitor({
            getServerPath: () => 'test',
            config: {
                serverProcessPollIntervall: 10,
            }
        } as any);

        const origLoop = monitor['createWatcher']();
        expect(origLoop).to.be.not.undefined;

        let startCalled = false;
        let stopCalled = false;
        monitor['createWatcher'] = ((a, b, c, d) => ({
            start: async () => {startCalled = true},
            stop: async () => {stopCalled = true},
        } as any)) as any;

        await monitor.start();

        monitor.restartLock = true;
        const lock = monitor.restartLock;

        await monitor.stop();    
        
        expect(startCalled).to.be.true;
        expect(stopCalled).to.be.true;
        expect(lock).to.be.true;
        
    });

    it('Monitor-stateChange', () => {
        
        let sentMsg;
        const monitor = new Monitor({
            discord: {
                relayRconMessage: (msg) => sentMsg = msg,
            },
        } as any);
        monitor['$internalServerState'] = ServerState.STARTED;
        let listenerCalled = false;
        monitor.registerStateListener('test', (s) => listenerCalled = true);

        monitor['internalServerState'] = ServerState.STOPPED;

        expect(sentMsg).to.be.not.undefined;
        expect(monitor.serverState).to.equal(ServerState.STOPPED);
        expect(listenerCalled).to.be.true;

        listenerCalled = false;
        monitor.removeStateListener('test');
        monitor['internalServerState'] = ServerState.STARTED;

        expect(monitor.serverState).to.equal(ServerState.STARTED);
        expect(listenerCalled).to.be.false;
    });

    it('Monitor-DayzProcesses', async () => {
        const monitor = new Monitor({
            getServerExePath: () => 'test/DayZServer_x64.exe'
        } as any);

        monitor['processes'].getProcessList = async () => [{
            Name: 'DayZ',
            ProcessId: '1234',
            ExecutablePath: 'test/DayZServer_x64.exe',
            CommandLine: 'DayZServer_x64 some arg',
            PrivatePageCount: '1234',
            CreationDate: '20210604142624',
            UserModeTime: '123456',
            KernelModeTime: '123456',
        }] as any;

        const res = await monitor.getDayZProcesses();
        const isRunning = await monitor.isServerRunning();

        expect(res.length).to.equal(1);
        expect(isRunning).to.be.true;
        expect(res[0].CreationDate).to.equal('2021-06-04 14:26:24');
    });

    it('Monitor-kill', async () => {
        const monitor = new Monitor({} as any);

        monitor['getDayZProcesses'] = async () => [{
            Name: 'DayZ',
            ProcessId: '1234',
            ExecutablePath: 'test/DayZServer_x64.exe',
            CommandLine: 'DayZServer_x64 some arg',
            PrivatePageCount: '1234',
            CreationDate: '20210604142624',
            UserModeTime: '123456',
            KernelModeTime: '123456',
        }];

        let killed = [];
        monitor['processes'].killProcess = async (pid, f) => {
            killed.push(pid);
            return null;
        };

        const res = await monitor.killServer(true);
        
        expect(killed.length).to.equal(1);
        expect(killed).to.include('1234');
    });

    it('Monitor-DayzProcesses-not running', async () => {
        const monitor = new Monitor({
            getServerExePath: () => 'test/DayZServer_x64.exe'
        } as any);

        monitor['processes'].getProcessList = async () => [];

        const noRes = await monitor.getDayZProcesses();
        const isNotRunning = await monitor.isServerRunning();
        expect(noRes.length).to.equal(0);
        expect(isNotRunning).to.be.false;

    });

    it('Monitor-SystemReport', async () => {
        const monitor = new Monitor({
            getServerExePath: () => 'test/DayZServer_x64.exe',
            metrics: {
                fetchMetrics: (a1, a2) => [],
            },
        } as any);

        monitor['processes'].getSystemUsage = () => {
            return merge(new SystemInfo(), {
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
        };

        monitor['processes'].getProcessList = () => [{
            Name: 'DayZ',
            ProcessId: '1234',
            ExecutablePath: 'test/DayZServer_x64.exe',
            CommandLine: 'DayZServer_x64 some arg',
            PrivatePageCount: '1234',
            CreationDate: '20210604142624',
            UserModeTime: '123456',
            KernelModeTime: '123456',
        },{
            Name: 'DayZ',
            ProcessId: '1234',
            ExecutablePath: 'DayZServer_x64.exe',
            CommandLine: 'DayZServer_x64 some arg',
            PrivatePageCount: '1234',
            CreationDate: '20210604142624',
            UserModeTime: '123456',
            KernelModeTime: '123456',
        }] as any;

        monitor['$internalServerState'] = ServerState.STARTED;

        const res = await monitor.getSystemReport();

        expect(res).to.be.not.undefined;

    });

    it('Monitor-startServer', async () => {

        const spawnMock = ImportMock.mockFunction(childProcess, 'spawn').returns({
            on: (t, r) => {
                if (t === 'exit') r(0);
            },
        });

        const writeFileSyncMock = ImportMock.mockFunction(fs, 'writeFileSync');

        let checkServerCalled = false;
        let checkModsCalled = false;
        let updateServerCalled = false;
        let updateModsCalled = false;
        const manager = {
            hooks: {
                executeHooks: (t) => {},
            },
            getServerPath: () => 'testPath',
            getWebPort: () => 4321,
            getIngameToken: () => '4321',
            config: {
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
            },
            ingameReport: {
                getServerMods: () => ['@DZSM'],
                installMod: () => {},
            },
            steamCmd: {
                checkServer: () => {
                    checkServerCalled = true;
                    return updateServerCalled;
                },
                updateServer: () => {
                    updateServerCalled = true;
                    return checkServerCalled;
                },
                updateMods: () => {
                    updateModsCalled = true;
                    return checkModsCalled;
                },
                installMods: () => {
                    return true;
                },
                checkMods: () => {
                    checkModsCalled = true;
                    return updateModsCalled;
                },
                buildWsModParams: () => [],
            },
            requirements: {
                checkWinErrorReporting: () => {},
                checkFirewall: () => {},
                checkOptionals: () => {},
            },
            rcon: {
                createBattleyeConf: () => {},
            },
        } as any;

        const monitor = new Monitor(manager);
        monitor['processes'].spawnForOutput = async () => ({
            status: 0,
            stderr: '',
            stdout: '',
        });

        await monitor.startServer();

        expect(checkModsCalled).to.be.true;
        expect(checkServerCalled).to.be.true;
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

class TestMonitor {
    processes = [];
    running = false;
    isRunningCount = 0;
    startCount = 0;
    
    async getDayZProcesses() {
        return this.processes;
    }

    async isServerRunning() {
        this.isRunningCount++;
        return this.running;
    }

    async startServer(skipPrep?: boolean) {
        this.startCount++;

        if (!this.running) {
            this.running = true;
        }

        return true;
    }

    manager =  null;
};

describe('Test class MonitorLoop', () => {

    before(() => {
        disableConsole();
    });

    after(() => {
        enableConsole();
    });

    let testMonitor: TestMonitor;
    let loop: MonitorLoop;
    const loopInterval = 10;
    const checkInterval = 100;
    const sleep = (time?: number) => new Promise((r) => setTimeout(r, 2 * (time ?? loopInterval)));

    beforeEach(() => {
        // restore mocks
        ImportMock.restore();
        
        testMonitor = new TestMonitor();
    
        loop = new MonitorLoop(
            testMonitor,
            'serverPath',
            checkInterval,
            () => {},
        );
        loop['loopInterval'] = loopInterval;
    });

    afterEach(async () => {
        if (loop) {
            await loop.stop();
        }
    });

    it('MonitorLoop-stopLoop', async () => {

        testMonitor.running = true;
        await loop.start();
        await sleep();

        expect(testMonitor.isRunningCount).to.be.greaterThanOrEqual(1);

        await loop.stop();
        const curRunningCount = testMonitor.isRunningCount;
        await sleep();
        expect(testMonitor.isRunningCount).to.equal(curRunningCount);

        const lockFileMock = ImportMock.mockFunction(fs, 'existsSync', true);
        lockFileMock.reset();
    });

    it('MonitorLoop-lockfile', async () => {

        const lockFileMock = ImportMock.mockFunction(fs, 'existsSync', true);
        
        await loop.start();
        await sleep();

        expect(testMonitor.startCount).to.equal(0);
        expect(lockFileMock.callCount).to.be.greaterThanOrEqual(1);
        
        console.log('Resetting lock');
        ImportMock.restore();
        ImportMock.mockFunction(fs, 'existsSync', false);

        await sleep(checkInterval + loopInterval);
        expect(testMonitor.startCount).to.equal(1); // not called tooo often
        
        await loop.stop();

    });

    it('MonitorLoop-lockstate', async () => {

        loop.restartLock = true;
        
        await loop.start();
        await sleep();

        expect(testMonitor.startCount).to.equal(0);

        console.log('Resetting lock');
        loop.restartLock = false;
        
        await sleep(checkInterval + loopInterval);
        expect(testMonitor.startCount).to.equal(1);
        
        await loop.stop();

    });

    it('MonitorLoop-stuckstate', async () => {

        testMonitor.running = true;
        testMonitor.getDayZProcesses = async () => {
            return [{
                UserModeTime: 100 * 10000,
                KernelModeTime: 100 * 10000,
            }];
        };

        let warningDispatched = false;
        testMonitor.manager = {
            discord: {
                relayRconMessage: () => {
                    warningDispatched = true;
                }
            }
        }
        
        await loop.start();
        await sleep(checkInterval * 6);

        expect(warningDispatched).to.equal(true);
        
        await loop.stop();

    });

});
