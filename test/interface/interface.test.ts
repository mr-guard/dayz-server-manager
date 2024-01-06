import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { Interface } from '../../src/interface/interface';
import { Request } from '../../src/types/interface';
import { StubInstance, disableConsole, enableConsole, stubClass } from '../util';
import { DependencyContainer, Lifecycle, container } from 'tsyringe';
import { Manager } from '../../src/control/manager';
import { RCON } from '../../src/services/rcon';
import { Monitor } from '../../src/services/monitor';
import { Metrics } from '../../src/services/metrics';
import { SteamCMD } from '../../src/services/steamcmd';
import { LogReader } from '../../src/services/log-reader';
import { Backups } from '../../src/services/backups';
import { MissionFiles } from '../../src/services/mission-files';
import { ConfigFileHelper } from '../../src/config/config-file-helper';
import { ServerDetector } from '../../src/services/server-detector';
import { SystemReporter } from '../../src/services/system-reporter';


describe('Test Interface', () => {

    let injector: DependencyContainer;

    let manager: StubInstance<Manager>;
    let rcon: StubInstance<RCON>;
    let monitor: StubInstance<Monitor>;
    let systemReporter: StubInstance<SystemReporter>;
    let serverDetector: StubInstance<ServerDetector>;
    let metrics: StubInstance<Metrics>;
    let steamCmd: StubInstance<SteamCMD>;
    let logReader: StubInstance<LogReader>;
    let backups: StubInstance<Backups>;
    let missionFiles: StubInstance<MissionFiles>;
    let configFileHelper: StubInstance<ConfigFileHelper>;

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
        injector.register(RCON, stubClass(RCON), { lifecycle: Lifecycle.Singleton });
        injector.register(Monitor, stubClass(Monitor), { lifecycle: Lifecycle.Singleton });
        injector.register(SystemReporter, stubClass(SystemReporter), { lifecycle: Lifecycle.Singleton });
        injector.register(ServerDetector, stubClass(ServerDetector), { lifecycle: Lifecycle.Singleton });
        injector.register(Metrics, stubClass(Metrics), { lifecycle: Lifecycle.Singleton });
        injector.register(SteamCMD, stubClass(SteamCMD), { lifecycle: Lifecycle.Singleton });
        injector.register(LogReader, stubClass(LogReader), { lifecycle: Lifecycle.Singleton });
        injector.register(Backups, stubClass(Backups), { lifecycle: Lifecycle.Singleton });
        injector.register(MissionFiles, stubClass(MissionFiles), { lifecycle: Lifecycle.Singleton });
        injector.register(ConfigFileHelper, stubClass(ConfigFileHelper), { lifecycle: Lifecycle.Singleton });
        
        manager = injector.resolve(Manager) as any;
        manager.config = {
            admins: [{
                userId: 'admin',
                level: 'admin',
            }, {
                userId: 'whatever',
                level: 'view',
            }]
        } as any;
        manager.isUserOfLevel.returns(true);
        manager.initDone = true;
        
        rcon = injector.resolve(RCON) as any;
        rcon.getPlayers.resolves([]);
        rcon.getBans.resolves([]);
        rcon.getPlayersRaw.resolves('test');
        rcon.getBansRaw.resolves('test');

        monitor = injector.resolve(Monitor) as any;
        monitor.restartLock = false;

        systemReporter = injector.resolve(SystemReporter) as any;
        systemReporter.getSystemReport.resolves({
            format: () => 'test',
        } as any);
        
        serverDetector = injector.resolve(ServerDetector) as any;
        serverDetector.getDayZProcesses.resolves([{
            Name: 'DayZ',
            ProcessId: '1234',
            ExecutablePath: 'DayZServer_x64.exe',
            CommandLine: 'DayZServer_x64 some arg',
            PrivatePageCount: '1234',
            CreationDate: '20210604142624',
            UserModeTime: '123456',
            KernelModeTime: '123456',
        }]);
        
        metrics = injector.resolve(Metrics) as any;
        steamCmd = injector.resolve(SteamCMD) as any;
        logReader = injector.resolve(LogReader) as any;
        backups = injector.resolve(Backups) as any;
        missionFiles = injector.resolve(MissionFiles) as any;
        configFileHelper = injector.resolve(ConfigFileHelper) as any;
    });

    it('execute-non existing', async () => {
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'whatever',
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.be.greaterThanOrEqual(400);
    });

    it('execute-malformed', async () => {
        const handler = injector.resolve(Interface);
        const request = {
            resource: '',
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.be.greaterThanOrEqual(400);
    });

    it('execute-init lock', async () => {
        manager.initDone = false;
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'ping',
            user: 'admin',
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(423);
    });

    it('execute-unknown user', async () => {
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'ping',
            user: 'unknown'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.be.greaterThanOrEqual(400);
    });

    it('execute-auth level', async () => {
        manager.isUserOfLevel.returns(false);
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'ping',
            user: 'whatever'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(401);
    });


    it('execute-ping', async () => {
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'ping',
            user: 'admin'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(response.body).to.include('pong');
    });

    it('execute-process', async () => {
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'process',
            user: 'admin',
            accept: 'text/plain'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(response.body).to.include('20210604142624');
    });

    it('execute-process-not found', async () => {
        serverDetector.getDayZProcesses.resolves([]);

        const handler = injector.resolve(Interface);
        const request = {
            resource: 'process',
            user: 'admin'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(404);
    });

    it('execute-system', async () => {
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'system',
            user: 'admin',
            accept: 'text/plain',
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(response.body).to.equal('test');
    });

    it('execute-system-not found', async () => {
        systemReporter.getSystemReport.resolves(null);
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'system',
            user: 'admin'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(404);
    });

    it('execute-players', async () => {
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'players',
            user: 'admin',
            accept: 'text/plain',
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(response.body).to.equal('test');
    });

    it('execute-bans', async () => {
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'bans',
            user: 'admin',
            accept: 'text/plain',
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(response.body).to.equal('test');
    });

    it('execute-shutdown', async () => {
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'shutdown',
            user: 'admin',
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(rcon.shutdown.called).to.be.true;
    });

    it('execute-lock', async () => {
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'lock',
            user: 'admin',
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(rcon.lock.called).to.be.true;
    });

    it('execute-unlock', async () => {
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'unlock',
            user: 'admin',
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(rcon.unlock.called).to.be.true;
    });

    it('execute-global', async () => {
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'global',
            user: 'admin',
            body: {
                message: 'test'
            }
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(rcon.global.called).to.be.true;
    });

    it('execute-kickall', async () => {
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'kickall',
            user: 'admin',
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(rcon.kickAll.called).to.be.true;
    });

    it('execute-kick', async () => {
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'kick',
            user: 'admin',
            body: {
                player: 'test'
            }
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(rcon.kick.called).to.be.true;
    });

    it('execute-kick-missing param', async () => {
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'kick',
            user: 'admin',
            body: {
                player: ''
            }
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(400);
        expect(rcon.kick.called).to.be.false;
    });

    it('execute-ban', async () => {
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'ban',
            user: 'admin',
            body: {
                player: 'test'
            }
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(rcon.ban.called).to.be.true;
    });

    it('execute-removeban', async () => {
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'removeban',
            user: 'admin',
            body: {
                player: 'test'
            }
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(rcon.removeBan.called).to.be.true;
    });

    it('execute-reloadbans', async () => {
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'reloadbans',
            user: 'admin'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(rcon.reloadBans.called).to.be.true;
    });

    it('execute-restart', async () => {
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'restart',
            user: 'admin'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(monitor.killServer.called).to.be.true;
    });

    it('execute-lockrestart', async () => {
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'lockrestart',
            user: 'admin'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(monitor.restartLock).to.be.true;
    });

    it('execute-unlockrestart', async () => {
        monitor.restartLock = true;
        
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'unlockrestart',
            user: 'admin'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(monitor.restartLock).to.be.false;
    });

    it('execute-isrestartlocked', async () => {
        monitor.restartLock = true;

        const handler = injector.resolve(Interface);
        const request = {
            resource: 'isrestartlocked',
            user: 'admin'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(response.body).to.be.true;
    });

    it('execute-metrics', async () => {
        metrics.fetchMetrics.resolves([]);
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'metrics',
            user: 'admin',
            query: {
                type: 'test',
            },
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(metrics.fetchMetrics.firstCall.firstArg).to.equal('test');
    });

    it('execute-metrics-missing type', async () => {
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'metrics',
            user: 'admin',
            query: {
                type: '',
            },
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(400);
        expect(metrics.fetchMetrics.called).to.be.false;
    });

    it('execute-deleteMetrics', async () => {
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'deleteMetrics',
            user: 'admin',
            body: {
                maxAgeDays: '10',
            },
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(metrics.deleteMetrics.firstCall.firstArg).to.equal(864000000);
    });

    it('execute-logs', async () => {
        logReader.fetchLogs.resolves([]);
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'logs',
            user: 'admin',
            query: {
                type: 'test',
            },
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(logReader.fetchLogs.firstCall.firstArg).to.equal('test');
    });

    it('execute-login', async () => {
        manager.getUserLevel.callsFake((user): any => {
            return user === 'admin' ? 'test' : undefined;
        });
        
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'login',
            user: 'admin',
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(response.body).to.equal('test');
    });

    it('execute-config', async () => {
        configFileHelper.getConfigFileContent.returns('{}');
        
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'config',
            user: 'admin',
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(response.body).to.be.not.undefined;
    });

    it('execute-updateconfig', async () => {
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'updateconfig',
            user: 'admin',
            body: {
                config: 'test',
            },
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(configFileHelper.writeConfig.firstCall.firstArg).to.equal('test');
    });

    it('execute-updateMods', async () => {
        steamCmd.updateAllMods.resolves(true);
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'updatemods',
            user: 'admin'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(steamCmd.updateAllMods.called).to.be.true;
    });

    it('execute-updateServer', async () => {
        steamCmd.updateServer.resolves(true);
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'updateserver',
            user: 'admin'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(steamCmd.updateServer.called).to.be.true;
    });

    it('execute-backup', async () => {
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'backup',
            user: 'admin'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(backups.createBackup.called).to.be.true;
    });

    it('execute-getbackups', async () => {
        backups.getBackups.resolves([]);
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'getbackups',
            user: 'admin'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(backups.getBackups.called).to.be.true;
    });

    it('execute-writemissionfile', async () => {
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'writemissionfile',
            user: 'admin',
            body: {
                file: 'test',
                content: 'test'
            }
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(missionFiles.writeMissionFile.called).to.be.true;
    });

    it('execute-readmissionfile', async () => {
        missionFiles.readMissionFile.resolves('test-content');
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'readmissionfile',
            user: 'admin',
            query: {
                file: 'test',
            }
        } as any as Request;
        const response = await handler.execute(request);
        expect(response.status).to.equal(200);
        expect(missionFiles.readMissionFile.called).to.be.true;
    });

    it('execute-readmissionfiles', async () => {
        missionFiles.readMissionFile.resolves('test-content');
        const handler = injector.resolve(Interface);
        const request: Request = {
            resource: 'readmissionfiles',
            user: 'admin',
            body: {
                files: ['test1', 'test2', 'test3'],
            }
        };
        const response = await handler.execute(request);
        expect(response.status).to.equal(200);
        expect(missionFiles.readMissionFile.callCount).to.equal(3);
    });

    it('execute-readmissiondir', async () => {
        missionFiles.readMissionDir.resolves([]);
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'readmissiondir',
            user: 'admin',
            query: {
                dir: '/'
            }
        } as any as Request;
        const response = await handler.execute(request);
        expect(response.status).to.equal(200);
        expect(missionFiles.readMissionDir.called).to.be.true;
    });

    it('execute-writeprofilefile', async () => {
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'writeprofilefile',
            user: 'admin',
            body: {
                file: 'test',
                content: 'test'
            }
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(missionFiles.writeProfileFile.called).to.be.true;
    });

    it('execute-readprofilefile', async () => {
        missionFiles.readProfileFile.resolves('test-content');
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'readprofilefile',
            user: 'admin',
            query: {
                file: 'test',
            }
        } as any as Request;
        const response = await handler.execute(request);
        expect(response.status).to.equal(200);
        expect(missionFiles.readProfileFile.called).to.be.true;
    });

    it('execute-readprofilefiles', async () => {
        missionFiles.readProfileFile.resolves('test-content');
        const handler = injector.resolve(Interface);
        const request: Request = {
            resource: 'readprofilefiles',
            user: 'admin',
            body: {
                files: ['test1', 'test2', 'test3'],
            }
        };
        const response = await handler.execute(request);
        expect(response.status).to.equal(200);
        expect(missionFiles.readProfileFile.callCount).to.equal(3);
    });

    it('execute-readprofiledir', async () => {
        missionFiles.readProfileDir.resolves([]);
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'readprofiledir',
            user: 'admin',
            query: {
                dir: '/'
            }
        } as any as Request;
        const response = await handler.execute(request);
        expect(response.status).to.equal(200);
        expect(missionFiles.readProfileDir.called).to.be.true;
    });

    it('execute-serverinfo', async () => {
        manager.getServerInfo.resolves({ name: 'hello' } as any);
        const handler = injector.resolve(Interface);
        const request = {
            resource: 'serverinfo',
            user: 'admin',
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(manager.getServerInfo.called).to.be.true;
    });

});
