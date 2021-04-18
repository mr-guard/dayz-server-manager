export interface RconPlayer {
    id: string;
    name: string;
    beguid: string;
    ip: string;
    port: string;
    ping: string;
    lobby: boolean;
}

export interface RconBan {
    type: string; // 'ip' | 'guid',
    id: string;
    ban: string;
    time: string;
    reason: string;
}
