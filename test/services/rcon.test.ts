import 'reflect-metadata';

import { expect } from '../expect';
import { StubInstance, disableConsole, enableConsole, memfs, sleep, stubClass } from '../util';
import * as path from 'path';
import * as sinon from 'sinon';
import { ServerState } from '../../src/types/monitor';
import { BattleyeConf, RCON } from '../../src/services/rcon';
import { DependencyContainer, Lifecycle, container } from 'tsyringe';
import { Manager } from '../../src/control/manager';
import { DiscordBot } from '../../src/services/discord';
import { FSAPI, InjectionTokens } from '../../src/util/apis';
import { EventBus } from '../../src/control/event-bus';
import { InternalEventTypes } from '../../src/types/events';
import { Monitor } from '../../src/services/monitor';
import * as crc32 from 'buffer-crc32';
import { Socket } from 'dgram';

describe('Test class RCON', () => {

    let injector: DependencyContainer;
    
    let manager: StubInstance<Manager>;
    let eventBus: EventBus;
    let discord: StubInstance<DiscordBot>;
    let fs: FSAPI;
    let socket: StubInstance<Socket>;

    const createResponse = (payload: Buffer) => {
        const crc = crc32(payload);
        const header = Buffer.from([0x42, 0x45, 0x00, 0x00, 0x00, 0x00]);
        header.writeInt32BE(crc.readInt32LE(0), 2);

        return Buffer.concat([header, payload], header.length + payload.length);
    }

    const createLoginBuffer = () => Buffer.from([0xFF, 0x00, 0x01]);
    
    const createCmdBuffer = (seq: number, payload: string) => {
        const buff = Buffer.alloc(3 + payload.length);
        buff.writeUInt8(0xFF, 0);
        buff.writeUInt8(0x01, 1);
        buff.writeUInt8(seq, 2);
        buff.write(payload, 3);
        return buff;
    };

    const createCmdBuffers = (seq: number, payload: string) => {
        const payloadSlice = Math.floor(payload.length / 3);
        return [
            payload.slice(0, payloadSlice),
            payload.slice(payloadSlice, 2 * payloadSlice),
            payload.slice(2 * payloadSlice),
        ].map((x, i) => {
            const buff = Buffer.alloc(6 + x.length);
            buff.writeUInt8(0xFF, 0);
            buff.writeUInt8(0x01, 1);
            buff.writeUInt8(seq, 2);
            buff.writeUInt8(0, 3); // multi
            buff.writeUInt8(3, 4); // total
            buff.writeUInt8(i, 5); // index
            buff.write(x, 6);
            return buff;
        });
    };

    const getSocketListener = (sock: StubInstance<Socket>, type: 'listening' | 'message' | 'error' | 'close'): (Function | undefined) => {
        return sock.on.getCalls().find((x) => x.args[0] === type)?.args[1];
    };

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
        injector.register(EventBus, EventBus, { lifecycle: Lifecycle.Singleton });
        injector.register(DiscordBot, stubClass(DiscordBot), { lifecycle: Lifecycle.Singleton });
        injector.register(Monitor, stubClass(Monitor), { lifecycle: Lifecycle.Singleton });
        
        socket = new (stubClass(Socket)) as any;
        socket.address.returns({address: 'test', family: 'test', port: 1234});
        injector.register(InjectionTokens.rconSocket, { useValue: () => socket });

        manager = injector.resolve(Manager) as any;
        eventBus = injector.resolve(EventBus);
        discord = injector.resolve(DiscordBot) as any;
        fs = memfs({}, '/', injector);
    });

    it('Battleye conf', () => {
        const conf = new BattleyeConf('1', '2');
        expect(conf.RConPassword).to.equal('1');
        expect(conf.RestrictRCon).to.equal('2');
    });

    const startRCON = async () => {
        const rcon = injector.resolve(RCON);
        rcon.keepAlive = false;
        rcon.reconnectDelay = 0;

        await rcon.start(true);
        
        // await async listener
        await sleep(10);

        getSocketListener(socket, 'listening')!();

        getSocketListener(socket, 'message')!(createResponse(createLoginBuffer()));
        expect(rcon.isConnected()).to.be.true;

        return rcon;
    }

    it('RCON', async () => {
    
        const rcon = injector.resolve(RCON);
        rcon.keepAlive = false;
        rcon.reconnectDelay = 0;

        await rcon.start();
        
        expect(rcon.isConnected()).to.be.false;
        expect(getSocketListener(socket, 'message')).to.be.undefined;
        expect(getSocketListener(socket, 'close')).to.be.undefined;

        eventBus.emit(InternalEventTypes.MONITOR_STATE_CHANGE, ServerState.STARTED, undefined as any);

        // await async listener
        await sleep(10);
        
        getSocketListener(socket, 'listening')!();

        expect(getSocketListener(socket, 'message')).to.be.not.undefined;
        expect(getSocketListener(socket, 'close')).to.be.not.undefined;

        getSocketListener(socket, 'message')!(createResponse(createLoginBuffer()));
        
        expect(rcon.isConnected()).to.be.true;

        await rcon.stop();
        expect(socket.close.callCount).to.equal(1);
    });

    it('RCON-reconnect', async () => {
    
        const rcon = await startRCON();
        
        getSocketListener(socket, 'close')!();

        // await async reconnect
        await sleep(10);

        expect(rcon.isConnected()).to.be.false;
        expect(socket.bind.callCount).to.equal(2);
    });

    it('RCON-commands', async () => {

        const rcon = await startRCON();
        
        let sentCommand!: string;
        socket.send.callsFake((data) => {
            const buffer = data as any as Buffer;
            if (buffer.readUInt8(7) != 1) return;
            sentCommand = buffer.slice(9).toString();
            setTimeout(() => {
                getSocketListener(socket, 'message')!(createResponse(
                    createCmdBuffer(
                        buffer.readUInt8(8),
                        'test',
                    ),
                ));
            }, 1);
        });

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
    
        const rcon = await startRCON();
        
        let sentCommand!: string;
        socket.send.callsFake((data) => {
            const buffer = data as any as Buffer;
            sentCommand = buffer.slice(9).toString();
            if (sentCommand === 'players') {
                setTimeout(() => {
                    createCmdBuffers(
                        buffer.readUInt8(8),
                        `
                        1 127.0.0.1:1234 51 123abc(verified) player1
                        2 127.0.0.1:4321 90 abc123(verified) player2
                        `
                    ).forEach((x) => {
                        getSocketListener(socket, 'message')!(createResponse(x));
                    })
                }, 1)
            }
        });

        const res = await rcon.getPlayers();
        expect(res.length).to.equal(2);

    });

    it('RCON-kickAll', async () => {
    
        const rcon = await startRCON();

        let kicks: string[] = [];
        let sentCommand!: string;
        socket.send.callsFake((data) => {
            const buffer = data as any as Buffer;
            sentCommand = buffer.slice(9).toString();

            if (sentCommand === 'players') {
                setTimeout(() => {
                    createCmdBuffers(
                        buffer.readUInt8(8),
                        `
                        1 127.0.0.1:1234 51 123abc(verified) player1
                        2 127.0.0.1:4321 90 abc123(verified) player2
                        `
                    ).forEach((x) => {
                        getSocketListener(socket, 'message')!(createResponse(x));
                    })
                }, 1)
            }

            if (sentCommand.startsWith('kick')) {
                kicks.push(sentCommand);
                getSocketListener(socket, 'message')!(createResponse(
                    createCmdBuffer(
                        buffer.readUInt8(8),
                        'test',
                    ),
                ));
            }
        });

        await rcon.kickAll();
        expect(kicks.length).to.equal(2);
        expect(kicks.some((x) => x === 'kick 1')).to.be.true;
        expect(kicks.some((x) => x === 'kick 2')).to.be.true;

    });

    it('RCON-bans', async () => {
    
        const rcon = await startRCON();
        
        let sentCommand!: string;
        socket.send.callsFake((data) => {
            const buffer = data as any as Buffer;
            sentCommand = buffer.slice(9).toString();

            if (sentCommand === 'bans') {
                setTimeout(() => {
                    createCmdBuffers(
                        buffer.readUInt8(8),
                        `
                        1 123ABCD123 perm ban
                        2 127.0.0.1 90 ban
                        `
                    ).forEach((x) => {
                        getSocketListener(socket, 'message')!(createResponse(x));
                    })
                }, 1)
            }
        });

        const res = await rcon.getBans();
        expect(res.length).to.equal(2);

    });

    it('RCON-keepalive', async () => {
    
        const rcon = injector.resolve(RCON);
        rcon.reconnectDelay = 0;
        rcon.checkIntervalTime = 1;
        rcon.keepAliveIntervalTime = 10;
        rcon.serverTimeoutTime = 30;
        rcon.packetDebug = true;

        await rcon.start(true);

        // await async listener
        await sleep(10);

        getSocketListener(socket, 'listening')!();

        getSocketListener(socket, 'message')!(createResponse(createLoginBuffer()));
        expect(rcon.isConnected()).to.be.true;
        const curSeq = rcon['sequenceNumber'];
        await sleep(2 * rcon.keepAliveIntervalTime + 3 * rcon.checkIntervalTime);
        expect(
            socket.send.getCalls().some((packet) =>
                (packet.firstArg as any as Buffer).readUInt8(7) === 0x01
                && (packet.firstArg as any as Buffer).readUInt8(8) > curSeq
            )
        ).to.be.true;

        await sleep(rcon.serverTimeoutTime + 3 * rcon.checkIntervalTime);
        expect(rcon.isConnected()).to.be.false;

        await rcon.stop(); // cleanup

    });

    it('RCON-message', async () => {
    
        const rcon = await startRCON();
        
        const payload = 'test';
        const buff = Buffer.alloc(3 + payload.length);
        buff.writeUInt8(0xFF, 0);
        buff.writeUInt8(0x02, 1);
        buff.writeUInt8(123, 2); // random seq number
        buff.write(payload, 3);
        
        const callCountBefore = socket.send.callCount;
        getSocketListener(socket, 'message')!(createResponse(buff));

        expect(socket.send.callCount).to.equal(callCountBefore + 1);
        const ack = socket.send.lastCall.firstArg as any as Buffer;
        expect(ack).to.be.not.undefined;
        
        const ackType = ack.readUInt8(7);
        expect(ackType).to.equal(0x02);
        const ackSeq = ack.readUInt8(8);
        expect(ackSeq).to.equal(123);
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

    it('RCON-prioritytxt', async () => {
        const steamId = new Array(17).fill('0').join('');

        fs = memfs(
            {
                'test': {},
            },
            '/',
            injector,
        );
        manager.getServerPath.returns('/test');
        
        const rcon = injector.resolve(RCON);
        
        let guids = rcon.readPriorityTxt();
        expect(guids).to.be.empty;

        rcon.priorityTxt(steamId);
        rcon.priorityTxt(steamId);
        guids = rcon.readPriorityTxt();
        expect(guids.length).to.equal(1);
        expect(guids).to.include(steamId);
        
        rcon.unpriorityTxt(steamId);
        guids = rcon.readPriorityTxt();
        expect(guids).to.be.empty;

        expect(
            fs.existsSync(
                path.join(
                    '/test',
                    'priority.txt',
                ),
            ),
        ).to.be.true;
    });

    it('RCON-bantxt', async () => {
        const steamId = new Array(17).fill('0').join('');

        fs = memfs(
            {
                'test': {},
            },
            '/',
            injector,
        );
        manager.getServerPath.returns('/test');
        
        const rcon = injector.resolve(RCON);
        
        let guids = rcon.readBanTxt();
        expect(guids).to.be.empty;

        rcon.banTxt(steamId);
        rcon.banTxt(steamId);
        guids = rcon.readBanTxt();
        expect(guids.length).to.equal(1);
        expect(guids).to.include(rcon.steam64ToDayZID(steamId));
        
        rcon.unbanTxt(steamId);
        guids = rcon.readBanTxt();
        expect(guids).to.be.empty;
        
        expect(
            fs.existsSync(
                path.join(
                    '/test',
                    'ban.txt',
                ),
            ),
        ).to.be.true;
    });

    it('RCON-whitelisttxt', async () => {
        const steamId = new Array(17).fill('0').join('');

        fs = memfs(
            {
                'test': {},
            },
            '/',
            injector,
        );
        manager.getServerPath.returns('/test');
        
        const rcon = injector.resolve(RCON);
        
        let guids = rcon.readWhitelistTxt();
        expect(guids).to.be.empty;

        rcon.whitelistTxt(steamId);
        rcon.whitelistTxt(steamId);
        guids = rcon.readWhitelistTxt();
        expect(guids.length).to.equal(1);
        expect(guids).to.include(rcon.steam64ToDayZID(steamId));
        
        rcon.unwhitelistTxt(steamId);
        guids = rcon.readWhitelistTxt();
        expect(guids).to.be.empty;

        expect(
            fs.existsSync(
                path.join(
                    '/test',
                    'whitelist.txt',
                ),
            ),
        ).to.be.true;
    });

});
