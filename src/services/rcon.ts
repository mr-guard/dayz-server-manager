import { Connection, IPacketResponse, Socket } from '@senfo/battleye';
import { Manager } from '../control/manager';
import * as dgram from 'dgram';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import { Logger, LogLevel } from '../util/logger';
import { RconBan, RconPlayer } from '../types/rcon';
import { StatefulService } from '../types/service';
import { ServerState } from '../types/monitor';

export class BattleyeConf {

    public constructor(
        // eslint-disable-next-line @typescript-eslint/naming-convention
        public RConPassword: string,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        public RestrictRCon: string,
    ) {}

}

export class RCON implements StatefulService {

    private readonly RND_RCON_PW: string = `RCON${Math.floor(Math.random() * 100000)}`;

    private static log = new Logger('RCON');

    private socket: Socket | undefined;
    private connection: Connection | undefined;

    private connected: boolean = false;

    private fakePlayers: boolean = false;

    public constructor(
        public manager: Manager,
    ) {}

    public async start(): Promise<void> {

        this.createBattleyeConf();

        // get free listening port
        const openListeningPort = await new Promise<number | null>((r) => {
            const tempSocket = dgram.createSocket('udp4');
            tempSocket.bind(() => {
                const openUdpPort = tempSocket.address()?.port;
                tempSocket.close();
                r(openUdpPort);
            });
        });

        if (!openListeningPort) {
            throw new Error('Could not find open UDP Port for Listener');
        }

        // create socket
        this.socket = new Socket({
            port: openListeningPort,
        });

        this.socket.on('listening', (socket) => {
            const addr = socket.address();
            RCON.log.log(LogLevel.IMPORTANT, `Listening on ${typeof addr === 'string' ? addr : `${addr.address}:${addr.port}`}`);
        });

        this.socket.on('received', (resolved, packet /* , buffer, connection, info */) => {
            RCON.log.log(LogLevel.DEBUG, `received`, packet);
        });

        this.socket.on('sent', (packet /* , buffer, bytes, connection */) => {
            RCON.log.log(LogLevel.DEBUG, `sent`, packet);
        });

        this.socket.on('error', (err) => {
            RCON.log.log(LogLevel.ERROR, `socket error`, err.message);
        });

        this.manager.monitor.registerStateListener((state: ServerState) => {

            if (this.connection || state !== ServerState.STARTED) return;

            // create connection
            this.connection = this.socket.connection(
                {
                    name: 'rcon',
                    password: this.getRconPassword(),
                    ip: '127.0.0.1',
                    port: this.manager.config?.serverPort ?? 2302,
                },
                {
                    reconnect: true,              // reconnect on timeout
                    reconnectTimeout: 500,        // how long (in ms) to wait before trying to reconnect
                    keepAlive: true,              // send keepAlive packet
                    keepAliveInterval: 10000,     // keepAlive packet interval (in ms)
                    timeout: true,                // timeout packets
                    timeoutInterval: 1000,        // interval to check packets (in ms)
                    serverTimeout: 30000,         // timeout server connection (in ms)
                    packetTimeout: 1000,          // timeout packet check interval (in ms)
                    packetTimeoutThresholded: 5,  // packets to resend
                },
            );

            this.connection.on('message', (message /* , packet */) => {
                RCON.log.log(LogLevel.DEBUG, `message`, message);
                void this.manager.discord?.relayRconMessage(message);
            });

            this.connection.on('command', (data, resolved, packet) => {
                RCON.log.log(LogLevel.DEBUG, `command packet`, packet);
            });

            this.connection.on('disconnected', (reason) => {
                if (reason instanceof Error && reason?.message?.includes('Server connection timed out')) {
                    RCON.log.log(LogLevel.ERROR, `disconnected`, reason.message);
                } else {
                    RCON.log.log(LogLevel.ERROR, `disconnected`, reason);
                }
                this.connected = false;
            });

            this.connection.on('debug', (data) => {
                RCON.log.log(LogLevel.DEBUG, 'debug', data);
            });

            this.connection.on('error', (err) => {
                if (err instanceof Error && err?.message?.includes('Server connection timed out')) {
                    RCON.log.log(LogLevel.ERROR, `connection error`, err.message);
                } else {
                    RCON.log.log(LogLevel.ERROR, `connection error`, err);
                }
            });

            this.connection?.on('connected', () => {
                RCON.log.log(LogLevel.IMPORTANT, 'connected');
                this.connected = true;
                void this.sendCommand('say -1 Big Brother Connected.');
            });
        });

    }

    private getRconPassword(): string {
        return (
            this.manager.config?.rconPassword
                ? this.manager.config?.rconPassword
                : this.RND_RCON_PW
        );
    }

    private createBattleyeConf(): void {
        let battleyePath = this.manager.config?.battleyePath;
        if (!battleyePath) {
            battleyePath = 'battleye';
        }
        let baseDir = this.manager.getServerPath();
        const profiles = this.manager.config?.profilesPath;
        if (profiles) {
            if (path.isAbsolute(profiles)) {
                baseDir = profiles;
            } else {
                baseDir = path.join(baseDir, profiles);
            }
        }
        battleyePath = path.join(baseDir, battleyePath);

        const battleyeConfPath = path.join(battleyePath, 'BEServer_x64.cfg');
        const rConPassword = this.getRconPassword();

        fse.ensureDirSync(battleyePath);
        try {
            fse.readdirSync(battleyePath).forEach((x) => {
                console.log('BECFG: ' + x);
                const lower = x.toLowerCase();
                if (lower.includes('beserver') && lower.endsWith('.cfg')) {
                    fs.unlinkSync(path.join(battleyePath, x));
                }
            });
        } catch (e) {
            console.error(e);
        }
        fs.writeFileSync(
            battleyeConfPath,
            `RConPassword ${rConPassword}\nRestrictRCon 0`,
        );
    }

    private async sendCommand(command: string): Promise<string | null> {

        if (!this.connection || !this.connected) {
            return null;
        }

        let response: IPacketResponse = null;
        try {
            response = await this.connection.command(command);
            RCON.log.log(LogLevel.DEBUG, `response to ${response.command}:\n${response.data}`);
        } catch (e) {
            RCON.log.log(LogLevel.ERROR, 'Error while executing RCON command', e);
        }

        return response?.data ?? null;

    }

    public async stop(): Promise<void> {
        if (this.connection && this.connection.connected) {
            this.connection.kill(new Error('Reload'));
            this.connection = undefined;
            this.connected = false;
        }

        if (this.socket) {
            return new Promise<void>((r) => {
                (this.socket!['socket'] as dgram.Socket).close(() => {
                    this.socket = undefined;
                    r();
                });
            });
        }
    }

    private matchRegex(regex: RegExp, data: string): any[] {
        const matches = [];
        let match = null;
        // eslint-disable-next-line no-cond-assign
        while (match = regex.exec(data)) {
            matches.push(match);
        }
        return matches;
    }

    public async getBansRaw(): Promise<string | null> {
        return this.sendCommand('bans');
    }

    public async getBans(): Promise<RconBan[]> {
        const data = await this.getBansRaw();
        if (!data) {
            return [];
        }
        const guidBans = this.matchRegex(
            /(\d+)\s+([0-9a-fA-F]+)\s([perm|\d]+)\s+([\S ]+)$/gim,
            data,
        )
            ?.map((e) => e.slice(1, e.length - 1)) ?? [];
        const ipBans = this.matchRegex(
            /(\d+)\s+([0-9\.]+)\s+([perm|\d]+)\s+([\S ]+)$/gim,
            data,
        )
            ?.map((e) => e.slice(1, e.length - 1)) ?? [];

        return [
            ...guidBans
                .map((e) => ({
                    type: 'guid',
                    id: e[1],
                    ban: e[2],
                    time: e[3],
                    reason: e[4],
                })),
            ...ipBans
                .map((e) => ({
                    type: 'ip',
                    id: e[1],
                    ban: e[2],
                    time: e[3],
                    reason: e[4],
                })),
        ];
    }

    public async getPlayersRaw(): Promise<string | null> {
        return this.sendCommand('players');
    }

    public async getPlayers(): Promise<RconPlayer[]> {

        if (this.fakePlayers) {
            return [1, 2, 3, 15, 24, 42].map((x) => ({
                id: String(x),
                name: `TestPlayer${x}`,
                beguid: `111${x}-12341-124-5215125-1251251-125`,
                ip: '127.0.0.1',
                port: '1337',
                ping: String(Math.round(Math.random() * 100)),
                lobby: false,
            }));
        }

        const data = await this.getPlayersRaw();

        if (!data) {
            return [];
        }

        return this.matchRegex(
            /(\d+)\s+(\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+\b)\s+(\d+)\s+([0-9a-fA-F]+)\(\w+\)\s([\S ]+)$/gim,
            data,
        )
            .map((e) => {
                return {
                    id: e[1],
                    ip: e[2],
                    port: e[3],
                    ping: e[4],
                    beguid: e[5],
                    name: e[6]?.replace(' (Lobby)', ''),
                    lobby: !!e[6]?.includes(' (Lobby)'),
                };
            }) ?? [];
    }

    public async kick(player: string): Promise<void> {
        await this.sendCommand(`kick ${player}`);
    }

    public async kickAll(): Promise<void> {
        // await this.sendCommand(`kick -1`);
        const players = await this.getPlayers();
        if (players?.length) {
            await Promise.all(players.map((player) => this.kick(player.id)));
        }
    }

    public async ban(player: string): Promise<void> {
        await this.sendCommand(`ban ${player}`);
    }

    public async removeBan(player: string): Promise<void> {
        await this.sendCommand(`removeban ${player}`);
    }

    public async reloadBans(): Promise<void> {
        await this.sendCommand('reloadbans');
    }

    // public async shutdown(): Promise<void> {
    //     await this.sendCommand('#shutdown');
    // }

    public async global(message: string): Promise<void> {
        await this.sendCommand(`say -1 ${message}`);
    }

    public async lock(): Promise<void> {
        await this.sendCommand('lock');
    }

    public async unlock(): Promise<void> {
        await this.sendCommand('unlock');
    }

}
