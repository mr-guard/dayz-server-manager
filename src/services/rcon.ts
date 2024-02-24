import { Manager } from '../control/manager';
import * as dgram from 'dgram';
import * as crc32 from 'buffer-crc32';
import * as path from 'path';
import { LogLevel } from '../util/logger';
import { RconBan, RconPlayer } from '../types/rcon';
import { IStatefulService } from '../types/service';
import { ServerState } from '../types/monitor';
import { matchRegex } from '../util/match-regex';
import { delay, inject, injectable, registry, singleton } from 'tsyringe';
import { LoggerFactory } from './loggerfactory';
import { FSAPI, InjectionTokens, RCONSOCKETFACTORY } from '../util/apis';
import { EventBus } from '../control/event-bus';
import { InternalEventTypes } from '../types/events';
import { Listener } from 'eventemitter2';
import { Monitor } from './monitor';
import * as CryptoJS from 'crypto-js';
import * as bigInt from 'big-integer';
import { detectOS } from '../util/detect-os';

// eslint-disable-next-line no-shadow
export enum PacketType {
    LOGIN = 0,
    COMMAND = 1,
    MESSAGE = 2,
}

// eslint-disable-next-line no-shadow
export enum PacketDirection {
    REQUEST = 0,
    RESPONSE = 1,
    MULTI_PART_RESPONSE = 2,
}

export class IPacketAttributes {
    public timestamp?: number;
    public sent?: number;
    public sequence?: number;
    public total?: number;
    public index?: number;
    public data?: string;
    public password?: string;
    public command?: string;
    public message?: string;
    public login?: boolean;
    public part?: Buffer;
}

export class Packet extends IPacketAttributes {

    public resolve?: (response: string | null) => any;

    public constructor(
        public type: PacketType,
        public direction: PacketDirection,
        attributes: IPacketAttributes,
    ) {
        super();
        this.timestamp = new Date().valueOf();
        Object.assign(this, attributes);
    }

    public static fromBuffer(buffer: Buffer): Packet {
        const { length } = buffer
        if (length < 9) {
            throw new Error('Packet must contain at least 9 bytes')
        }

        const header = buffer.toString('utf8', 0, 2)
        if (header !== 'BE') {
            throw new Error('Invalid header text')
        }

        const payload = buffer.slice(6, length)
        const checksum = buffer.readInt32BE(2)
        const crc = crc32(payload).readInt32LE(0)

        if (checksum !== crc) {
            throw new Error('Packet checksum verification failed.')
        }

        if (payload.readUInt8(0) !== 0xFF) {
            throw new Error('Packet missing 0xFF flag after checksum.')
        }

        const type = payload.readUInt8(1)
        const attributes: IPacketAttributes = {}
        let direction = PacketDirection.RESPONSE

        switch (type) {
            case PacketType.LOGIN: {
                attributes.login = (payload.readUInt8(2) === 1);
                break;
            }
            case PacketType.COMMAND: {
                attributes.sequence = payload.readUInt8(2);
                if (payload.length > 4 && payload.readUInt8(3) === 0) {
                    attributes.total = payload.readUInt8(4);
                    attributes.index = payload.readUInt8(5);
                    attributes.part = payload.slice(6, payload.length);
                    direction = PacketDirection.MULTI_PART_RESPONSE;
                } else {
                    attributes.data = payload.slice(3, payload.length).toString();
                }
                break;
            }
            case PacketType.MESSAGE: {
                attributes.sequence = payload.readUInt8(2);
                attributes.message = payload.slice(3, payload.length).toString();
                break;
            }
            default: {
                throw new Error(`Unknown PacketType ${type}`);
            }
        }

        return new Packet(type, direction, attributes)
    }

    public get valid(): boolean {
        return (Number.isInteger(this.type) && Number.isInteger(this.direction))
    }
    /**
     * serialize packet to be sent to battleye
     *
     * @returns {Buffer}
     * @memberof Packet
     */
    public serialize(): Buffer {
        if (!this.valid) {
            throw new Error('Invalid Packet')
        }

        let payload: Buffer;
        switch (this.type) {
            case PacketType.LOGIN:
                if (!this.password) {
                    throw new Error('Missing password');
                }
                payload = Buffer.alloc(this.password.length + 2);
                payload.writeUInt8(0xFF, 0);
                payload.writeUInt8(this.type, 1);
                payload.write(this.password, 2);
                break;
            case PacketType.COMMAND:
                if (this.command === undefined || this.command === null) {
                    throw new Error('Missing Command');
                }
                payload = Buffer.alloc(this.command.length + 3);
                payload.writeUInt8(0xFF, 0);
                payload.writeUInt8(this.type, 1);
                payload.writeUInt8(this.sequence, 2);
                payload.write(this.command, 3);
                break;
            case PacketType.MESSAGE:
                payload = Buffer.alloc(3);
                payload.writeUInt8(0xFF, 0);
                payload.writeUInt8(this.type, 1);
                payload.writeUInt8(this.sequence, 2);
                break;
            default:
                throw new Error(`Unknown PacketType ${this.type}`);
        }

        const crc = crc32(payload);
        const header = Buffer.from([0x42, 0x45, 0x00, 0x00, 0x00, 0x00]);
        header.writeInt32BE(crc.readInt32LE(0), 2);

        this.sent = this.sent ? this.sent + 1 : 1

        return Buffer.concat([header, payload], header.length + payload.length)
    }
}


export class BattleyeConf {

    public constructor(
        // eslint-disable-next-line @typescript-eslint/naming-convention
        public RConPassword: string,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        public RestrictRCon: string,
    ) {}

}

@singleton()
@registry([{
    token: InjectionTokens.rconSocket,
    useFactory: /* istanbul ignore next */ () => /* istanbul ignore next */ () => dgram.createSocket('udp4'),
}]) // eslint-disable-line @typescript-eslint/indent
@injectable()
export class RCON extends IStatefulService {

    public keepAlive = true; // KeepAlive enabled
    public reconnectDelay = 1000; // time to wait before reconnecting (in ms)
    public checkIntervalTime = 1000; // check interval (in ms)
    public keepAliveIntervalTime = 10000; // keepAlive packet interval (in ms)
    public serverTimeoutTime = 30000; // timeout server connection (in ms)
    public packetDebug = process.env['DZSM_DEBUG_RCON_PACKETS'] === 'true'; // debug raw packages

    private readonly RND_RCON_PW: string = `RCON${Math.floor(Math.random() * 100000)}`;

    private socket: dgram.Socket | undefined;

    private sequenceNumber: number = -1;

    private requests: (Packet | undefined)[] = new Array(255).fill(undefined);
    private multipart: (Packet[] | undefined)[] = new Array(255).fill(undefined);

    private lastResponse: number = 0;
    private lastCommand: number = 0
    private keepAliveInterval?: any;
    private reconnectTimeout?: any;
    private loginTimeout?: any;

    private started: boolean = false;
    private connected: boolean = false;
    private loggedIn: boolean = false;

    private duplicateMessageCache: string[] = [];
    private duplicateMessageCacheSize: number = 3;

    private stateListener?: Listener;

    public constructor(
        loggerFactory: LoggerFactory,
        private manager: Manager,
        private eventBus: EventBus,
        @inject(delay(() => Monitor)) private monitor: Monitor,
        @inject(InjectionTokens.fs) private fs: FSAPI,
        @inject(InjectionTokens.rconSocket) private socketFactory: RCONSOCKETFACTORY,
    ) {
        super(loggerFactory.createLogger('RCON'));
    }

    public isConnected(): boolean {
        return this.connected && this.loggedIn;
    }

    private createSocket(): dgram.Socket {
        return this.socketFactory();
    }

    public async start(skipServerWait?: boolean): Promise<void> {

        this.started = true;
        this.stateListener?.off();
        this.stateListener = undefined;

        const serverCfg = await this.manager.getServerCfg();
        if (serverCfg?.BattlEye === 0) {
            return;
        }

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

        if (skipServerWait || this.monitor.serverState === ServerState.STARTED) {
            this.reset();
        } else {
            this.stateListener = this.eventBus.on(
                InternalEventTypes.MONITOR_STATE_CHANGE,
                async (state: ServerState) => {
                    if (this.socket || state !== ServerState.STARTED) return;
                    this.stateListener?.off();
                    this.stateListener = undefined;
                    this.reset();
                },
            );
        }
    }

    private setupConnection(): void {

        // create socket
        this.socket = this.createSocket();

        this.socket.on('error', /* istanbul ignore next */ (err) => {
            this.reset(err);
        });

        this.socket.on('message', (packet) => {
            this.receive(packet);
        });

        this.socket.on('listening', () => {
            this.connected = true;
            const addr = this.socket.address();
            this.log.log(LogLevel.IMPORTANT, `Listening on ${typeof addr === 'string' ? addr : `${addr.address}:${addr.port}`}`);

            this.login();
        });

        this.socket.on('close', () => {
            this.log.log(LogLevel.WARN, `RCON Socket closed`);
            this.reset();
        });

        this.socket.bind();
    }

    private reset(err?: any): void {
        this.connected = false;
        this.loggedIn = false;

        this.sequenceNumber = -1;

        this.requests?.forEach(/* istanbul ignore next */ (x) => {
            x?.resolve?.(undefined);
        })
        this.requests = new Array(255).fill(undefined);
        this.multipart = new Array(255).fill(undefined);
        this.duplicateMessageCache = [];

        this.lastResponse = 0;
        this.lastCommand = 0;

        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = undefined;
        }
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = undefined;
        }
        if (this.loginTimeout) {
            clearTimeout(this.loginTimeout);
            this.loginTimeout = undefined;
        }

        if (err) {
            this.log.log(LogLevel.ERROR, `RCON error`, err instanceof Error ? err.message : err);

            // restart on connection errors (disabled for now)
            // this.connectionErrorCounter++;
            // if (this.connectionErrorCounter >= 5) {
            //     await this.stop();
            //     void this.start(true);
            // }
        }

        if (this.socket) {
            this.socket.unref();
            this.socket.removeAllListeners();
            this.socket.on('error', /* istanbul ignore next */ () => {}); // ignore errors on close
            this.socket.close();
            this.socket = undefined;
        }

        if (this.started) {
            this.reconnectTimeout = setTimeout(
                () => {
                    this.setupConnection();
                },
                this.reconnectDelay,
            )
        }
    }

    private getRconPassword(): string {
        return (
            this.manager.config?.rconPassword
                ? this.manager.config?.rconPassword
                : this.RND_RCON_PW
        );
    }

    private getRconPort(): number {
        return (
            this.manager.config?.rconPort
                ? this.manager.config?.rconPort
                : 2306
        );
    }

    private getRconIP(): string {
        return this.manager.config?.rconIP || '127.0.0.1';
    }

    public createBattleyeConf(): void {
        let battleyePath = this.manager.config?.battleyePath;
        if (!battleyePath) {
            battleyePath = 'battleye';
        }
        let baseDir = this.manager.getServerPath();

        if (detectOS() === 'windows') {
            const profiles = this.manager.config?.profilesPath;
            if (profiles) {
                if (path.isAbsolute(profiles)) {
                    baseDir = profiles;
                } else {
                    baseDir = path.join(baseDir, profiles);
                }
            }
        }
        battleyePath = path.join(baseDir, battleyePath);

        let beConfName = 'BEServer_x64.cfg';
        if (detectOS() !== 'windows') {
            beConfName = beConfName.toLowerCase(); // who would have thought...
        }
        const battleyeConfPath = path.join(
            battleyePath,
            beConfName,
        );
        const rConPassword = this.getRconPassword();
        const rConPort = this.getRconPort();
        const rConIP = this.getRconIP();

        this.fs.mkdirSync(battleyePath, { recursive: true });
        try {
            this.fs.readdirSync(battleyePath).forEach((x) => {
                const lower = x.toLowerCase();
                if (lower.includes('beserver') && lower.endsWith('.cfg')) {
                    this.fs.unlinkSync(path.join(battleyePath, x));
                }
            });
        } catch {}
        this.fs.writeFileSync(
            battleyeConfPath,
            [
                `RConPassword ${rConPassword}`,
                `RestrictRCon 0`,
                `RConPort ${rConPort}`,
                ...(rConIP ? [`RConIP ${rConIP}`] : []),
            ].join('\n'),
        );
    }

    public async stop(): Promise<void> {
        this.started = false;

        this.stateListener?.off();
        this.stateListener = undefined;

        this.log.log(LogLevel.DEBUG, 'RCON stopping');
        this.reset();
    }

    public async getBansRaw(): Promise<string | null> {
        return this.command('bans');
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
        return this.command('players');
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
        await this.command(`kick ${player}`);
    }

    public async kickAll(): Promise<void> {
        // await this.sendCommand(`kick -1`);
        const players = await this.getPlayers();
        if (players?.length) {
            await Promise.all(players.map((player) => this.kick(player.id)));
        }
    }

    public async ban(player: string): Promise<void> {
        await this.command(`ban ${player}`);
    }

    public async removeBan(player: string): Promise<void> {
        await this.command(`removeban ${player}`);
    }

    public async reloadBans(): Promise<void> {
        await this.command('reloadbans');
    }

    public async shutdown(): Promise<void> {
        await this.command('#shutdown');
    }

    public async global(message: string): Promise<void> {
        await this.command(`say -1 ${message}`);
    }

    public async lock(): Promise<void> {
        await this.command('#lock');
    }

    public async unlock(): Promise<void> {
        await this.command('#unlock');
    }

    private sendPacket(packet: Packet, isResolvable: boolean): void {
        if (!this.connected) return;
        this.lastCommand = new Date().getTime();
        if (packet.type === PacketType.COMMAND && (packet.sequence ?? -1) < 0) {
            packet.sequence = this.sequenceNumber = (this.sequenceNumber + 1) % 256;
        }
        if (this.requests[packet.sequence] && this.requests[packet.sequence] != packet) {
            this.log.log(LogLevel.DEBUG, `Earlier packet with seq ${packet.sequence} will be resolved as failed`);
            this.requests[packet.sequence].resolve?.(null);
            this.requests[packet.sequence] = undefined;
        }
        if (isResolvable) {
            this.requests[packet.sequence] = packet;
        }
        try {
            const buf = packet.serialize();
            this.socket.send(buf, 0, buf.length, this.getRconPort(), this.getRconIP())
            if (this.packetDebug) {
                this.log.log(LogLevel.DEBUG, 'Sent', packet);
            }
        } catch (e) {
            this.log.log(LogLevel.ERROR, 'Error while sending packet', e);
        }
    }

    private startKeepAlive(): void {
        if (!this.keepAlive) return; // mainly for tests
        this.keepAliveInterval = setInterval(() => {
            if ((new Date().getTime() - this.lastResponse) > this.serverTimeoutTime) {
                this.log.log(LogLevel.ERROR, 'RCON Connection timed out');
                this.reset();
                return;
            }
            if ((new Date().getTime() - this.lastCommand) > this.keepAliveIntervalTime) {
                void this.command('').then((resp) => {
                    if (this.packetDebug && resp !== undefined && resp !== null) {
                        this.log.log(LogLevel.DEBUG, 'RCON Keepalive Ack', resp);
                    }
                });
                if (this.packetDebug) {
                    this.log.log(LogLevel.DEBUG, 'RCON Keepalive sent');
                }
            }
        }, this.checkIntervalTime);
    }

    // send login packet
    private login(): void {
        this.loginTimeout = setTimeout(/* istanbul ignore next */ () => {
            this.log.log(LogLevel.WARN, 'Login TimeOut. Reconnecting..');
            this.reset();
        }, this.serverTimeoutTime);
        this.sendPacket(
            new Packet(
                PacketType.LOGIN,
                PacketDirection.REQUEST,
                {
                    password: this.getRconPassword(),
                },
            ),
            false,
        );
    }

    public command(command: string): Promise<string | null> {
        if (!this.connected || !this.loggedIn) {
            this.log.log(LogLevel.DEBUG, `Cannot send command '${command}'. Not connected`);
            return Promise.resolve(null);
        }
        if (this.packetDebug) {
            this.log.log(LogLevel.DEBUG, `Sending command: ${command}`);
        }

        return new Promise((resolve) => {
            const packet = new Packet(
                PacketType.COMMAND,
                PacketDirection.REQUEST,
                { command },
            );
            packet.resolve = (data) => {
                if (command?.length || this.packetDebug) {
                    if (data === undefined || data === null) {
                        this.log.log(LogLevel.WARN, `Command '${command}' (${packet.sequence}) failed`);
                    } else if (this.packetDebug) {
                        this.log.log(LogLevel.DEBUG, `Command '${command}' (${packet.sequence}) succeed`);
                    }
                }
                resolve(data);
            };
            this.sendPacket(packet, true);
        });
    }

    private receive(buffer: Buffer): void {
        let packet: Packet;
        try {
            packet = Packet.fromBuffer(buffer)
        } catch (e) {
            this.log.log(LogLevel.ERROR, 'Failed to parse RCON packet', e);
            return;
        }

        if (!packet.valid) {
            this.log.log(LogLevel.ERROR, 'Received invalid RCON packet');
            return;
        }

        this.lastResponse = new Date().getTime();

        if (this.packetDebug) {
            this.log.log(LogLevel.DEBUG, 'Received packet', packet);
        }

        if (packet.direction === PacketDirection.MULTI_PART_RESPONSE) {
            if (
                !this.multipart[packet.sequence]?.length
                || this.multipart[packet.sequence].length !== packet.total
            ) {
                this.multipart[packet.sequence] = new Array(packet.total).fill(undefined);
            }

            this.multipart[packet.sequence][packet.index] = packet;

            if (this.multipart[packet.sequence].every((x) => x !== undefined)) {
                const parts = this.multipart[packet.sequence];
                this.multipart[packet.sequence] = [];
                try {
                    const buff = Buffer.concat(
                        parts.map((x) => x.part),
                        parts.reduce((prev, cur) => prev + cur.part.length, 0),
                    );
                    packet = new Packet(
                        PacketType.COMMAND,
                        PacketDirection.RESPONSE,
                        {
                            data: buff.toString(),
                            sequence: packet.sequence,
                        },
                    );
                    if (this.packetDebug) {
                        this.log.log(LogLevel.DEBUG, 'Multipart response completed', packet.data);
                    }
                } catch {
                    this.log.log(LogLevel.ERROR, 'Error joining multipart RCON response');
                    return;
                }
            } else {
                // not all parts received
                return;
            }
        }

        switch (packet.type) {
            case PacketType.LOGIN: {
                if (this.loginTimeout) {
                    clearTimeout(this.loginTimeout);
                    this.loginTimeout = undefined;
                }
                if (!packet.login) {
                    this.log.log(LogLevel.ERROR, 'Invalid Password. Disconnected..');
                    this.reset();
                } else {
                    this.loggedIn = packet.login;
                    this.log.log(LogLevel.IMPORTANT, 'Log-In Successful. RCON Connected');
                    void this.command('say -1 Big Brother Connected.');
                    this.startKeepAlive();
                }
                break;
            }
            case PacketType.COMMAND: {
                // resolve the request
                if (this.packetDebug) {
                    this.log.log(LogLevel.DEBUG, `Resolving command '${this.requests[packet.sequence]?.command}' (${packet.sequence}) with ${packet.data}`);
                }
                this.requests[packet.sequence]?.resolve?.(packet.data);
                this.requests[packet.sequence] = undefined;
                break;
            }
            case PacketType.MESSAGE: {
                // acknowledge
                this.sendPacket(
                    new Packet(
                        PacketType.MESSAGE,
                        PacketDirection.RESPONSE,
                        { sequence: packet.sequence },
                    ),
                    false,
                );

                this.handleMessage(packet.message);
                break;
            }
            default: {
                this.log.log(LogLevel.WARN, 'Received packet of unknown type', packet, buffer);
                break;
            }
        }
    }

    private handleMessage(message: string): void {
        if (this.duplicateMessageCache.includes(message)) {
            this.log.log(LogLevel.DEBUG, `duplicate message`, message);
            return;
        }
        this.duplicateMessageCache.push(message);
        if (this.duplicateMessageCache.length > this.duplicateMessageCacheSize) {
            this.duplicateMessageCache.shift();
        }

        this.log.log(LogLevel.DEBUG, `message`, message);
        this.eventBus.emit(
            InternalEventTypes.DISCORD_MESSAGE,
            {
                type: 'rcon',
                message,
            },
        );
    }

    public steam64ToDayZID(steam64Id: string): string {
        if (!steam64Id || steam64Id.length !== 17) return '';
        return CryptoJS.SHA256(steam64Id)
            .toString(CryptoJS.enc.Base64)
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    }

    /* istanbul ignore next */
    public steam64ToBEGUID(steam64Id: string): string {
        if (!steam64Id || steam64Id.length !== 17) return '';
        let steamId = bigInt(steam64Id);

        const parts = [0x42, 0x45, 0, 0, 0, 0, 0, 0, 0, 0];

        for (var i = 2; i < 10; i++) {
            var res = steamId.divmod(256);
            steamId = res.quotient;
            parts[i] = res.remainder.toJSNumber();
        }

        const wordArray = CryptoJS.lib.WordArray.create(new Uint8Array(parts) as any);
        const hash = CryptoJS.MD5(wordArray);
        return hash.toString();
    }

    private readGuidFile(file: string): ({ lines: string[]; linefeed: string }) {
        if (!this.fs.existsSync(file)) {
            return {
                linefeed: '\r\n',
                lines: [],
            };
        }
        const content = this.fs.readFileSync(
            file,
            { encoding: 'utf-8' },
        );
        const linefeed = content.includes('\r\n') ? '\r\n' : '\n';
        return {
            linefeed,
            lines: content.split(linefeed),
        };
    }

    private removeGuidFromFile(steamId: string, file: string): void {
        if (!steamId || !(steamId.length === 17 || steamId.length === 44)) return;
        steamId = steamId.length === 17 ? this.steam64ToDayZID(steamId) : steamId;
        const baseDir = this.manager.getServerPath();
        const filePath = path.join(baseDir, file);
        const content = this.readGuidFile(filePath);
        content.lines = content.lines.filter((x) => !x.trim().startsWith(steamId));
        this.fs.writeFileSync(
            filePath,
            content.lines.join(content.linefeed),
        );
    }

    private readGuidsFromFile(file: string): string[] {
        const baseDir = this.manager.getServerPath();
        const filePath = path.join(baseDir, file);
        const content = this.readGuidFile(filePath);
        return content.lines
            .map((x) => x.trim())
            .filter((x) => !!x && !x.startsWith('//'))
            .map((x) => x.includes('//') ? x.slice(0, x.indexOf('//')).trim() : x);
    }

    private addGuidToFile(steamId: string, file: string): void {
        if (!steamId) return;
        if (steamId.length !== 17 && steamId.length !== 44) return;
        steamId = steamId.length === 17 ? this.steam64ToDayZID(steamId) : steamId;
        const baseDir = this.manager.getServerPath();
        const filePath = path.join(baseDir, file);
        const content = this.readGuidFile(filePath);
        if (!content.lines.some((x) => x.trim().startsWith(steamId))) {
            content.lines.push(steamId);
            this.fs.writeFileSync(
                filePath,
                content.lines.join(content.linefeed),
            );
        }
    }

    public readBanTxt(): string[] {
        return this.readGuidsFromFile('ban.txt');
    }

    public banTxt(steamId: string): void {
        this.addGuidToFile(steamId, 'ban.txt');
    }

    public unbanTxt(steamId: string): void {
        this.removeGuidFromFile(steamId, 'ban.txt');
    }

    public readWhitelistTxt(): string[] {
        return this.readGuidsFromFile('whitelist.txt');
    }

    public whitelistTxt(steamId: string): void {
        this.addGuidToFile(steamId, 'whitelist.txt');
    }

    public unwhitelistTxt(steamId: string): void {
        this.removeGuidFromFile(steamId, 'whitelist.txt');
    }

    public readPriorityTxt(): string[] {
        const baseDir = this.manager.getServerPath();
        const filePath = path.join(baseDir, 'priority.txt');
        const guids = new Set<string>();
        if (this.fs.existsSync(filePath)) {
            const content = this.readGuidFile(filePath);
            for (const line of content.lines) {
                const lineGuids = line
                    .split(';')
                    .map((x) => x.trim())
                    .filter((x) => !!x);
                for (const guid of lineGuids) {
                    guids.add(guid);
                }
            }
        }
        return [...guids.values()];
    }

    public priorityTxt(steamId: string): void {
        if (!steamId || steamId.length !== 17) return;
        const baseDir = this.manager.getServerPath();
        const filePath = path.join(baseDir, 'priority.txt');
        const guids = this.readPriorityTxt();
        guids.push(steamId);
        this.fs.writeFileSync(
            filePath,
            guids.join(';'),
        );
    }

    public unpriorityTxt(steamId: string): void {
        if (!steamId || steamId.length !== 17) return;
        const baseDir = this.manager.getServerPath();
        const filePath = path.join(baseDir, 'priority.txt');
        const guids = this.readPriorityTxt();
        this.fs.writeFileSync(
            filePath,
            guids.filter((x) => x !== steamId).join(';'),
        );
    }
}
