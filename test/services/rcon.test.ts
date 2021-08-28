import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { disableConsole, enableConsole } from '../util';
import * as path from 'path';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import { ServerState } from '../../src/types/monitor';
import { BattleyeConf, RCON } from '../../src/services/rcon';

describe('Test class RCON', () => {

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

    it('Battleye conf', () => {
        const conf = new BattleyeConf('1', '2');
        expect(conf.RConPassword).to.equal('1');
        expect(conf.RestrictRCon).to.equal('2');
    });

    it('RCON', async () => {
    
        let startCallBack;
        const manager = {
            monitor: {
                registerStateListener: (t, c) => {
                    startCallBack = c;
                },
                removeStateListener: (t) => {},
            },
            config: {}
        } as any;

        const rcon = new RCON(manager);

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
        };

        let rconDest;
        let rconOpts;
        const sock = {
            on: (t, c) => {
                if (t === 'listening') c(sock);
                else c(null);
            },
            address: () => 'test',

            connection: (dest, opts) => {
                rconDest = dest;
                rconOpts = opts;
                return conn;
            },

            removeAllListeners: () => {},

            socket: {
                close: (c) => c(),
            }
        } as any;
        rcon['createSocket'] = (p) => sock;

        await rcon.start();

        expect(startCallBack).to.be.not.undefined;

        startCallBack(ServerState.STARTED);

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
        await new Promise((r) => setTimeout(r, 100));
        expect(commandCalled).to.be.not.undefined;

        await rcon.stop();
        expect(killCalled).to.be.true;
    });

    it('RCON-commands', async () => {
    
        let sentCommand;
        const rcon = new RCON(null);
        rcon['connected'] = true;
        rcon['connection'] = {
            command: (cmd: string) => {
                sentCommand = cmd;
            }
        } as any;

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
    
        const rcon = new RCON(null);
        rcon['connected'] = true;
        rcon['connection'] = {
            command: (cmd: string) => {
                if (cmd === 'players') {
                    return {
                        data: `
                        1 127.0.0.1:1234 51 123abc(verified) player1
                        2 127.0.0.1:4321 90 abc123(verified) player2
                        `
                    };
                }
            }
        } as any;

        const res = await rcon.getPlayers();
        expect(res.length).to.equal(2);

    });

    it('RCON-kickAll', async () => {
    
        const rcon = new RCON(null);
        rcon['connected'] = true;
        
        let kicks: string[] = [];
        rcon['connection'] = {
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
            }
        } as any;

        const res = await rcon.kickAll();
        expect(kicks.length).to.equal(2);
        expect(kicks.some((x) => x === 'kick 1')).to.be.true;
        expect(kicks.some((x) => x === 'kick 2')).to.be.true;

    });

    it('RCON-conf', async () => {
    
        ImportMock.mockFunction(fse, 'ensureDirSync');
        const readDirMock = ImportMock.mockFunction(fs, 'readdirSync', ['beserver.txt', 'beserver.cfg']);
        const rmMock = ImportMock.mockFunction(fs, 'unlinkSync');
        const writeMock = ImportMock.mockFunction(fs, 'writeFileSync');

        const rcon = new RCON({
            config: {
                profilesPath: 'profs'
            },
            getServerPath: () => 'test',
        } as any);
        
        await rcon.createBattleyeConf();
        
        expect(readDirMock.callCount).to.equal(1);
        expect(rmMock.callCount).to.equal(1);
        expect(writeMock.callCount).to.equal(1);
        expect(writeMock.firstCall.args[0]).to.equal(
            path.join(
                'test',
                'profs',
                'battleye',
                'BEServer_x64.cfg'
            )
        );

    });

    it('RCON-bans', async () => {
    
        const rcon = new RCON(null);
        rcon['connected'] = true;
        rcon['connection'] = {
            command: (cmd: string) => {
                if (cmd === 'bans') {
                    return {
                        data: `
                        1 123ABCD123 perm ban
                        2 127.0.0.1 90 ban
                        `
                    };
                }
            }
        } as any;

        const res = await rcon.getBans();
        expect(res.length).to.equal(2);

    });

});
