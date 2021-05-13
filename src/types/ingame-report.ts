
export interface IngameReportEntry {
    entryType: string;
    type: string;
    name: string;
    id: number;
    position: string;
    speed: string;
    damage: number;
}

export interface IngameReportContainer {
    players: IngameReportContainer[];
    vehicles: IngameReportContainer[];
}
