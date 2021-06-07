import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { Interface } from '../../src/interface/interface';
import { Request } from '../../src/types/interface';
import { ManagerController } from '../../src/control/manager-controller';
import { disableConsole, enableConsole } from '../util';

class TestManager {
    config = {
        admins: [{
            userId: 'admin',
            level: 'admin',
        }, {
            userId: 'whatever',
            level: 'view',
        }]
    };
    metrics = {
        pushMetricValue: (a1, a2) => {},
    };
    monitor = {
        getDayZProcesses: () => [{
            Name: 'DayZ',
            ProcessId: '1234',
            ExecutablePath: 'DayZServer_x64.exe',
            CommandLine: 'DayZServer_x64 some arg',
            PrivatePageCount: '1234',
            CreationDate: '20210604142624',
            UserModeTime: '123456',
            KernelModeTime: '123456',
        }],
        getSystemReport: () => ({
            format: () => 'test',
        }),
    };
    rcon = {
        getPlayers: () => [],
        getBans: () => [],
        getPlayersRaw: () => 'test',
        getBansRaw: () => 'test',
    };
    isUserOfLevel = (a1, a2) => true;
    initDone = true;
}


describe('Test Interface', () => {

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

    it('execute-non existing', async () => {
        const handler = new Interface(null);
        const request = {
            resource: 'whatever',
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.be.greaterThanOrEqual(400);
    });

    it('execute-malformed', async () => {
        const handler = new Interface(null);
        const request = {
            resource: '',
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.be.greaterThanOrEqual(400);
    });

    it('execute-init lock', async () => {
        const manager = new TestManager();
        manager.initDone = false;
        const handler = new Interface(manager as any);
        const request = {
            resource: 'ping',
            user: 'admin',
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(423);
    });

    it('execute-unknown user', async () => {
        const manager = new TestManager();
        const handler = new Interface(manager as any);
        const request = {
            resource: 'ping',
            user: 'unknown'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.be.greaterThanOrEqual(400);
    });

    it('execute-auth level', async () => {
        const manager = new TestManager();
        manager.isUserOfLevel = (a1, a2) => false;
        const handler = new Interface(manager as any);
        const request = {
            resource: 'ping',
            user: 'whatever'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(401);
    });


    it('execute-ping', async () => {
        const manager = new TestManager();
        const handler = new Interface(manager as any);
        const request = {
            resource: 'ping',
            user: 'admin'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(response.body).to.include('pong');
    });

    it('execute-process', async () => {
        const manager = new TestManager();
        const handler = new Interface(manager as any);
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
        const manager = new TestManager();
        manager.monitor.getDayZProcesses = () => [];

        const handler = new Interface(manager as any);
        const request = {
            resource: 'process',
            user: 'admin'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(404);
    });

    it('execute-system', async () => {
        const manager = new TestManager();
        
        const handler = new Interface(manager as any);
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
        const manager = new TestManager();
        manager.monitor.getSystemReport = () => null;
        const handler = new Interface(manager as any);
        const request = {
            resource: 'system',
            user: 'admin'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(404);
    });

    it('execute-players', async () => {
        const manager = new TestManager();
        
        const handler = new Interface(manager as any);
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
        const manager = new TestManager();
        
        const handler = new Interface(manager as any);
        const request = {
            resource: 'bans',
            user: 'admin',
            accept: 'text/plain',
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(response.body).to.equal('test');
    });

    it('execute-lock', async () => {
        let executed = false;
        const manager = new TestManager();
        manager.rcon = {
            lock: () => executed = true,
        } as any;
        
        const handler = new Interface(manager as any);
        const request = {
            resource: 'lock',
            user: 'admin',
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(executed).to.be.true;
    });

    it('execute-unlock', async () => {
        let executed = false;
        const manager = new TestManager();
        manager.rcon = {
            unlock: () => executed = true,
        } as any;
        
        const handler = new Interface(manager as any);
        const request = {
            resource: 'unlock',
            user: 'admin',
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(executed).to.be.true;
    });

    it('execute-global', async () => {
        let executed = false;
        const manager = new TestManager();
        manager.rcon = {
            global: (m) => executed = true,
        } as any;
        
        const handler = new Interface(manager as any);
        const request = {
            resource: 'global',
            user: 'admin',
            body: {
                message: 'test'
            }
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(executed).to.be.true;
    });

    it('execute-kickall', async () => {
        let executed = false;
        const manager = new TestManager();
        manager.rcon = {
            kickAll: () => executed = true,
        } as any;
        
        const handler = new Interface(manager as any);
        const request = {
            resource: 'kickall',
            user: 'admin',
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(executed).to.be.true;
    });

    it('execute-kick', async () => {
        let executed = false;
        const manager = new TestManager();
        manager.rcon = {
            kick: (p) => executed = true,
        } as any;
        
        const handler = new Interface(manager as any);
        const request = {
            resource: 'kick',
            user: 'admin',
            body: {
                player: 'test'
            }
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(executed).to.be.true;
    });

    it('execute-kick-missing param', async () => {
        let executed = false;
        const manager = new TestManager();
        manager.rcon = {
            kick: (p) => executed = true,
        } as any;
        
        const handler = new Interface(manager as any);
        const request = {
            resource: 'kick',
            user: 'admin',
            body: {
                player: ''
            }
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(400);
        expect(executed).to.be.false;
    });

    it('execute-ban', async () => {
        let executed = false;
        const manager = new TestManager();
        manager.rcon = {
            ban: (p) => executed = true,
        } as any;
        
        const handler = new Interface(manager as any);
        const request = {
            resource: 'ban',
            user: 'admin',
            body: {
                player: 'test'
            }
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(executed).to.be.true;
    });

    it('execute-removeban', async () => {
        let executed = false;
        const manager = new TestManager();
        manager.rcon = {
            removeBan: (p) => executed = true,
        } as any;
        
        const handler = new Interface(manager as any);
        const request = {
            resource: 'removeban',
            user: 'admin',
            body: {
                player: 'test'
            }
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(executed).to.be.true;
    });

    it('execute-reloadbans', async () => {
        let executed = false;
        const manager = new TestManager();
        manager.rcon = {
            reloadBans: () => executed = true,
        } as any;
        
        const handler = new Interface(manager as any);
        const request = {
            resource: 'reloadbans',
            user: 'admin'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(executed).to.be.true;
    });

    it('execute-restart', async () => {
        let executed = false;
        const manager = new TestManager();
        manager.monitor = {
            killServer: () => executed = true,
        } as any;
        
        const handler = new Interface(manager as any);
        const request = {
            resource: 'restart',
            user: 'admin'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(executed).to.be.true;
    });

    it('execute-lockrestart', async () => {
        const manager = new TestManager();
        manager.monitor = {
            restartLock: false,
        } as any;
        
        const handler = new Interface(manager as any);
        const request = {
            resource: 'lockrestart',
            user: 'admin'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(manager.monitor['restartLock']).to.be.true;
    });

    it('execute-unlockrestart', async () => {
        const manager = new TestManager();
        manager.monitor = {
            restartLock: true,
        } as any;
        
        const handler = new Interface(manager as any);
        const request = {
            resource: 'unlockrestart',
            user: 'admin'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(manager.monitor['restartLock']).to.be.false;
    });

    it('execute-isrestartlocked', async () => {
        const manager = new TestManager();
        manager.monitor = {
            restartLock: true,
        } as any;
        
        const handler = new Interface(manager as any);
        const request = {
            resource: 'isrestartlocked',
            user: 'admin'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(response.body).to.be.true;
    });

    it('execute-metrics', async () => {
        const manager = new TestManager();
        let executedType;
        manager.metrics = {
            pushMetricValue: (p) => {}, // audit
            fetchMetrics: (type) => {
                executedType = type;
                return [];
            },
        } as any;
        
        const handler = new Interface(manager as any);
        const request = {
            resource: 'metrics',
            user: 'admin',
            query: {
                type: 'test',
            },
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(executedType).to.equal('test');
    });

    it('execute-metrics-missing type', async () => {
        const manager = new TestManager();
        let executedType;
        manager.metrics = {
            pushMetricValue: (p) => {}, // audit
            fetchMetrics: (type) => {
                executedType = type;
                return [];
            },
        } as any;
        
        const handler = new Interface(manager as any);
        const request = {
            resource: 'metrics',
            user: 'admin',
            query: {
                type: '',
            },
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(400);
        expect(executedType).to.be.undefined;
    });

    it('execute-deleteMetrics', async () => {
        const manager = new TestManager();
        let executedDays;
        manager.metrics = {
            pushMetricValue: (p) => {}, // audit
            deleteMetrics: (days) => executedDays = days,
        } as any;
        
        const handler = new Interface(manager as any);
        const request = {
            resource: 'deleteMetrics',
            user: 'admin',
            body: {
                maxAgeDays: '10',
            },
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(executedDays).to.equal(10);
    });

    it('execute-logs', async () => {
        const manager = new TestManager() as any;
        let executedType;
        manager.logReader = {
            fetchLogs: (t, s) => executedType = t,
        } as any;
        
        const handler = new Interface(manager as any);
        const request = {
            resource: 'logs',
            user: 'admin',
            query: {
                type: 'test',
            },
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(executedType).to.equal('test');
    });

    it('execute-login', async () => {
        const manager = new TestManager() as any;
        manager.getUserLevel = (user) => user === 'admin' ? 'test' : undefined;
        
        const handler = new Interface(manager as any);
        const request = {
            resource: 'login',
            user: 'admin',
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(response.body).to.equal('test');
    });

    it('execute-config', async () => {
        const manager = new TestManager() as any;
        
        const handler = new Interface(manager as any);
        const request = {
            resource: 'config',
            user: 'admin',
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(response.body).to.be.not.undefined;
    });

    it('execute-updateconfig', async () => {
        const manager = new TestManager() as any;
        let executedConfig;
        manager.writeConfig = (c) => executedConfig = c;
        
        const startMock = ImportMock.mockFunction(ManagerController.INSTANCE, 'start');

        const handler = new Interface(manager as any);
        const request = {
            resource: 'updateconfig',
            user: 'admin',
            body: {
                config: 'test',
            },
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(executedConfig).to.equal('test');
        expect(startMock.callCount).to.equal(1);
    });

    it('execute-updateMods', async () => {
        let executed = false;
        const manager = new TestManager() as any;
        manager.steamCmd = {
            updateMods: () => executed = true,
        } as any;
        
        const handler = new Interface(manager as any);
        const request = {
            resource: 'updatemods',
            user: 'admin'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(executed).to.be.true;
    });

    it('execute-updateServer', async () => {
        let executed = false;
        const manager = new TestManager() as any;
        manager.steamCmd = {
            updateServer: () => executed = true,
        } as any;
        
        const handler = new Interface(manager as any);
        const request = {
            resource: 'updateserver',
            user: 'admin'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(executed).to.be.true;
    });

    it('execute-backup', async () => {
        let executed = false;
        const manager = new TestManager() as any;
        manager.backup = {
            createBackup: () => executed = true,
        } as any;
        
        const handler = new Interface(manager as any);
        const request = {
            resource: 'backup',
            user: 'admin'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(executed).to.be.true;
    });

    it('execute-getbackups', async () => {
        let executed = false;
        const manager = new TestManager() as any;
        manager.backup = {
            getBackups: () => executed = true,
        } as any;
        
        const handler = new Interface(manager as any);
        const request = {
            resource: 'getbackups',
            user: 'admin'
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(executed).to.be.true;
    });

    it('execute-writemissionfile', async () => {
        let executed = false;
        const manager = new TestManager() as any;
        manager.missionFiles = {
            writeMissionFile: () => executed = true,
        } as any;
        
        const handler = new Interface(manager as any);
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
        expect(executed).to.be.true;
    });

    it('execute-readmissionfile', async () => {
        let executed = false;
        const manager = new TestManager() as any;
        manager.missionFiles = {
            readMissionFile: () => executed = true,
        } as any;
        
        const handler = new Interface(manager as any);
        const request = {
            resource: 'readmissionfile',
            user: 'admin',
            body: {
                file: 'test',
            }
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(executed).to.be.true;
    });

    it('execute-serverinfo', async () => {
        let executed = false;
        const manager = new TestManager() as any;
        manager.getServerInfo = () => executed = true;
        
        const handler = new Interface(manager as any);
        const request = {
            resource: 'serverinfo',
            user: 'admin',
        } as any as Request;
        const response = await handler.execute(request);

        expect(response.status).to.equal(200);
        expect(executed).to.be.true;
    });

});
