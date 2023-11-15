
export interface IngameReportEntry {
    entryType: 'VEHICLE' | 'PLAYER';
    type: string;
    name: string;
    id2?: string;
    id: number;
    position: string;
    speed: string;
    damage: number;
    category: 'GROUND' | 'AIR' | 'SEA' | 'MAN';
}

export interface IngameReportContainer {
    players: IngameReportContainer[];
    vehicles: IngameReportContainer[];
}
