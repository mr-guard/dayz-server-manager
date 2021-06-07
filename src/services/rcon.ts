import { Connection, IPacketResponse, Socket } from '@senfo/battleye';
import { Manager } from '../control/manager';
import * as dgram from 'dgram';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import { Logger, LogLevel } from '../util/logger';
import { RconBan, RconPlayer } from '../types/rcon';
import { IStatefulService } from '../types/service';
import { ServerState } from '../types/monitor';
import { matchRegex } from '../util/match-regex';

export class BattleyeConf {

    public constructor(
        // eslint-disable-next-line @typescript-eslint/naming-convention
        public RConPassword: string,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        public RestrictRCon: string,
    ) {}

}

export class RCON implements IStatefulService {

    private readonly RND_RCON_PW: string = `RCON${Math.floor(Math.random() * 100000)}`;

    private log = new Logger('RCON');

    private socket: Socket | undefined;
    private connection: Connection | undefined;

    private connected: boolean = false;

    private connectionErrorCounter: number = 0;

    public constructor(
        public manager: Manager,
    ) {}

    private createSocket(port: number): Socket {
        return new Socket({
            port,
        });
    }

    public async start(skipServerWait?: boolean): Promise<void> {

        this.connectionErrorCounter = 0;

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
        this.socket = this.createSocket(openListeningPort);

        this.socket.on('listening', (socket) => {
            const addr = socket.address();
            this.log.log(LogLevel.IMPORTANT, `Listening on ${typeof addr === 'string' ? addr : `${addr.address}:${addr.port}`}`);
        });

        this.socket.on('received', (resolved, packet /* , buffer, connection, info */) => {
            this.log.log(LogLevel.DEBUG, `received`, packet);
        });

        this.socket.on('sent', (packet /* , buffer, bytes, connection */) => {
            this.log.log(LogLevel.DEBUG, `sent`, packet);
        });

        this.socket.on('error', (err) => {
            this.log.log(LogLevel.ERROR, `socket error`, err?.message);
        });

        if (skipServerWait) {
            this.setupConnection();
        } else {
            this.manager.monitor.registerStateListener('rconInit', (state: ServerState) => {
                if (this.connection || state !== ServerState.STARTED) return;
                this.manager.monitor.removeStateListener('rconInit');
                this.setupConnection();
            });
        }

    }

    private setupConnection(): void {
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
            this.log.log(LogLevel.DEBUG, `message`, message);
            void this.manager.discord?.relayRconMessage(message);
        });

        this.connection.on('command', (data, resolved, packet) => {
            this.log.log(LogLevel.DEBUG, `command packet`, packet);
        });

        this.connection.on('disconnected', (reason) => {
            if (reason instanceof Error && reason?.message?.includes('Server connection timed out')) {
                this.log.log(LogLevel.ERROR, `disconnected`, reason.message);
            } else {
                this.log.log(LogLevel.ERROR, `disconnected`, reason);
            }
            this.connected = false;
        });

        this.connection.on('debug', (data) => {
            this.log.log(LogLevel.DEBUG, 'debug', data);
        });

        this.connection.on('error', async (err) => {
            if (err instanceof Error && err?.message?.includes('Server connection timed out')) {
                this.log.log(LogLevel.ERROR, `connection error`, err.message);

                // restart on connection errors (disabled for now)
                // this.connectionErrorCounter++;
                // if (this.connectionErrorCounter >= 5) {
                //     await this.stop();
                //     void this.start(true);
                // }

            } else {
                this.log.log(LogLevel.ERROR, `connection error`, err);
            }
        });

        this.connection.on('connected', () => {
            this.log.log(LogLevel.IMPORTANT, 'connected');
            this.connected = true;
            void this.sendCommand('say -1 Big Brother Connected.');
        });
    }

    private getRconPassword(): string {
        return (
            this.manager.config?.rconPassword
                ? this.manager.config?.rconPassword
                : this.RND_RCON_PW
        );
    }

    public createBattleyeConf(): void {
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
            fs.readdirSync(battleyePath).forEach((x) => {
                const lower = x.toLowerCase();
                if (lower.includes('beserver') && lower.endsWith('.cfg')) {
                    fs.unlinkSync(path.join(battleyePath, x));
                }
            });
        } catch {}
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
            this.log.log(LogLevel.DEBUG, `response to ${response.command}:\n${response.data}`);
        } catch (e) {
            this.log.log(LogLevel.ERROR, 'Error while executing RCON command', e);
        }

        return response?.data ?? null;

    }

    public async stop(): Promise<void> {
        if (this.connection) {
            this.connection.removeAllListeners();
            if (this.connection.connected) {
                this.connection.kill(new Error('Reload'));
                this.connection = undefined;
                this.connected = false;
            }
        }

        if (this.socket) {
            return new Promise<void>((r) => {
                this.socket.removeAllListeners();
                ((this.socket!['socket'] as dgram.Socket) ?? {
                    close: (c) => c(),
                }).close(() => {
                    this.socket = undefined;
                    r();
                });
            });
        }
    }

    public async getBansRaw(): Promise<string | null> {
        return this.sendCommand('bans');
    }

    public async getBans(): Promise<RconBan[]> {
        const data = await this.getBansRaw();
        if (!data) {
            return [];
        }
        const guidBans = matchRegex(
            /(\d+)\s+([0-9a-fA-F]+)\s([perm|\d]+)\s+([\S ]+)$/gim,
            data,
        )
            ?.map((e) => e.slice(1, e.length - 1)) ?? [];
        const ipBans = matchRegex(
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

        const data = await this.getPlayersRaw();

        if (!data) {
            return [];
        }

        return matchRegex(
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
