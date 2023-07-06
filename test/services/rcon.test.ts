import 'reflect-metadata';

import { expect } from '../expect';
import { StubInstance, disableConsole, enableConsole, memfs, stubClass } from '../util';
import * as path from 'path';
import * as sinon from 'sinon';
import { ServerState } from '../../src/types/monitor';
import { BattleyeConf, RCON } from '../../src/services/rcon';
import { DependencyContainer, Lifecycle, container } from 'tsyringe';
import { Manager } from '../../src/control/manager';
import { Monitor, ServerStateListener } from '../../src/services/monitor';
import { DiscordBot } from '../../src/services/discord';
import { FSAPI, InjectionTokens } from '../../src/util/apis';
import { Connection, Socket } from '@senfo/battleye';

describe('Test class RCON', () => {

    let injector: DependencyContainer;
    
    let manager: StubInstance<Manager>;
    let monitor: StubInstance<Monitor>;
    let discord: StubInstance<DiscordBot>;
    let fs: FSAPI;
    let socket: StubInstance<Socket>;

    before(() => {
        disableConsole();
    });

    after(() => {
        enableConsole();
    });

    beforeEach(() => {
        container.reset();
        injector = container.createChildContainer();
        injector.register(Manager, stubClass(Manager), { lifecycle: Lifecycle.Singleton });
        injector.register(Monitor, stubClass(Monitor), { lifecycle: Lifecycle.Singleton });
        injector.register(DiscordBot, stubClass(DiscordBot), { lifecycle: Lifecycle.Singleton });
        
        socket = new (stubClass(Socket)) as any;
        injector.register(InjectionTokens.rconSocket, { useValue: () => socket });

        manager = injector.resolve(Manager) as any;
        monitor = injector.resolve(Monitor) as any;
        discord = injector.resolve(DiscordBot) as any;
        fs = memfs({}, '/', injector);
    });

    it('Battleye conf', () => {
        const conf = new BattleyeConf('1', '2');
        expect(conf.RConPassword).to.equal('1');
        expect(conf.RestrictRCon).to.equal('2');
    });

    it('RCON', async () => {
    
        let startCallBack: ServerStateListener;
        monitor.registerStateListener.callsFake((_, c) => {
            startCallBack = c;
        });
        
        const rcon = injector.resolve(RCON);

        let commandCalled = false;

        let msgCb;
        let cmdCb;
        let dbgCb;
        let errCb;
        let conCb;
        let disCb;
        let killCalled = false;
        const conn = {
            on: (t, cb) => {
                if (t === 'message') msgCb = cb
                else if (t === 'command') cmdCb = cb
                else if (t === 'disconnected') disCb = cb
                else if (t === 'debug') dbgCb = cb
                else if (t === 'error') errCb = cb
                else if (t === 'connected') conCb = cb
            },
            once: (t, c) => {},
            command: (command) => {
                commandCalled = command;
                return null;
            },
            removeAllListeners: () => {},

            connected: true,
            kill: (e) => {
                killCalled = true;
            },
        } as any as Connection;

        let rconDest;
        let rconOpts;
        
        socket.on.callsFake(
            (t: any, c: Function): Socket => {
                if (t === 'listening') c({
                    address: () => 'test',
                });
                else c(null);
                return socket;
            },
        );
        socket.connection.callsFake((dest: any, opts: any) => {
            rconDest = dest;
            rconOpts = opts;
            return conn;
        });

        await rcon.start();

        expect(startCallBack!).to.be.not.undefined;

        expect(rcon.isConnected()).to.be.false;
        startCallBack!(ServerState.STARTED);

        expect(msgCb).to.be.not.undefined;
        expect(cmdCb).to.be.not.undefined;
        expect(dbgCb).to.be.not.undefined;
        expect(errCb).to.be.not.undefined;
        expect(conCb).to.be.not.undefined;
        expect(disCb).to.be.not.undefined;

        await msgCb(null);
        await cmdCb(null, null, null);
        await dbgCb(null);
        await disCb(new Error('test'));
        await errCb(new Error('test'));

        expect(commandCalled).to.be.false;
        
        await conCb();
        expect(rcon.isConnected()).to.be.true;
        
        expect(commandCalled).to.be.not.undefined;

        await rcon.stop();
        expect(killCalled).to.be.true;
    });

    it('RCON-commands', async () => {
    
        let sentCommand;
        const connection = {
            command: (cmd: string) => {
                sentCommand = cmd;
                return {
                    data: cmd,
                }
            },
            on: sinon.stub()
                .callsFake((t, c) => {
                    if (t == 'connected') {
                        c();
                    }
                }),
        } as any as Connection;
        socket.connection.callsFake(() => {
            return connection;
        });

        const rcon = injector.resolve(RCON);
        
        await rcon.start(true);
        expect(rcon.isConnected()).to.be.true;

        await rcon.shutdown();
        expect(sentCommand).to.equal('#shutdown');

        await rcon.unlock();
        expect(sentCommand).to.equal('#unlock');

        await rcon.lock();
        expect(sentCommand).to.equal('#lock');

        await rcon.global('test');
        expect(sentCommand).to.include('say -1');

        await rcon.reloadBans();
        expect(sentCommand).to.equal('reloadbans');

        await rcon.removeBan('123');
        expect(sentCommand).to.include('removeban');
        expect(sentCommand).to.include('123');

        await rcon.ban('123');
        expect(sentCommand).to.include('ban');
        expect(sentCommand).to.include('123');

        await rcon.kick('123');
        expect(sentCommand).to.include('kick');
        expect(sentCommand).to.include('123');
        
    });

    it('RCON-players', async () => {
    
        const connection = {
            command: (cmd: string) => {
                if (cmd === 'players') {
                    return {
                        data: `
                        1 127.0.0.1:1234 51 123abc(verified) player1
                        2 127.0.0.1:4321 90 abc123(verified) player2
                        `
                    };
                }
            },
            on: sinon.stub()
                .withArgs('connection')
                .callsArg(1),
        } as any as Connection;
        socket.connection.returns(connection);

        const rcon = injector.resolve(RCON);
        
        await rcon.start(true);

        const res = await rcon.getPlayers();
        expect(res.length).to.equal(2);

    });

    it('RCON-kickAll', async () => {
    
        let kicks: string[] = [];
        const connection = {
            command: (cmd: string) => {
                if (cmd === 'players') {
                    return {
                        data: `
                        1 127.0.0.1:1234 51 123abc(verified) player1
                        2 127.0.0.1:4321 90 abc123(verified) player2
                        `
                    };
                } else if (cmd.includes('kick')) {
                    kicks.push(cmd);
                }
            },
            on: sinon.stub()
                .withArgs('connection')
                .callsArg(1),
        } as any as Connection;
        socket.connection.returns(connection);

        const rcon = injector.resolve(RCON);
        
        await rcon.start(true);

        await rcon.kickAll();
        expect(kicks.length).to.equal(2);
        expect(kicks.some((x) => x === 'kick 1')).to.be.true;
        expect(kicks.some((x) => x === 'kick 2')).to.be.true;

    });

    it('RCON-bans', async () => {
    
        const connection = {
            command: (cmd: string) => {
                if (cmd === 'bans') {
                    return {
                        data: `
                        1 123ABCD123 perm ban
                        2 127.0.0.1 90 ban
                        `
                    };
                }
            },
            on: sinon.stub()
                .withArgs('connection')
                .callsArg(1),
        } as any as Connection;
        socket.connection.returns(connection);

        const rcon = injector.resolve(RCON);
        
        await rcon.start(true);

        const res = await rcon.getBans();
        expect(res.length).to.equal(2);

    });

    it('RCON-conf', async () => {
    
        fs = memfs(
            {
                'test': {
                    'profs': {
                        'battleye': {
                            'beserver.txt': '',
                            'beserver.cfg': '',
                        },
                    },
                },
            },
            '/',
            injector,
        );
        manager.getServerPath.returns('/test')
        manager.config = {
            profilesPath: 'profs'
        } as any;
        
        const rcon = injector.resolve(RCON);
        
        await rcon.createBattleyeConf();
        
        expect(
            fs.existsSync(
                path.join(
                    '/test',
                    'profs',
                    'battleye',
                    'BEServer_x64.cfg'
                ),
            ),
        ).to.be.true;

        expect(
            fs.existsSync(
                path.join(
                    '/test',
                    'profs',
                    'battleye',
                    'beserver.cfg'
                ),
            ),
        ).to.be.false;

        expect(
            fs.existsSync(
                path.join(
                    '/test',
                    'profs',
                    'battleye',
                    'beserver.txt'
                ),
            ),
        ).to.be.true;

    });

});
