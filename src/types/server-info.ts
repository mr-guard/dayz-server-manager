export interface ServerInfo {

    name: string;
    port: number;
    worldName: string;
    password: boolean;
    battleye: boolean;
    maxPlayers: number;

}


export const isSameServerInfo = (x1?: ServerInfo, x2?: ServerInfo): boolean => {
    if (!x1 && !x2) {
        return true;
    }

    if (!x1 || !x2) {
        return false;
    }

    return [
        'name',
        'port',
        'worldName',
        'password',
        'battleye',
        'maxPlayers',
    ].every((x) => (x1 as any)[x] === (x2 as any)[x]);
};
