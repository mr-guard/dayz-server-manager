// eslint-disable-next-line no-shadow
export enum ServerState {
    STOPPED = 'STOPPED',
    STOPPING = 'STOPPING',
    STARTED = 'STARTED',
    STARTING = 'STARTING'
}

export class UsageItem {

    public cpuTotal: number = -1;
    public cpuSpent: number = -1;
    public uptime: number = -1;
    public cpuEach?: number[] = [];
    public mem: number = -1;
    public memTotal?: number = -1;

}

export class SystemReport {

    public system: UsageItem = new UsageItem();
    public serverState: ServerState = ServerState.STOPPED;
    public manager: UsageItem = new UsageItem();
    public server?: UsageItem;

    public format(): string {
        const report = [
            'System Usage:',
            `CPU: ${this.system.cpuTotal}% (${this.system.cpuEach?.map((x) => `${x}%`).join(' ')})`,
            `RAM: ${this.system.mem} MB / ${this.system.memTotal} MB`,
            'Manager:',
            `CPU: ${this.manager.cpuTotal}%`,
            `RAM: ${this.manager.mem} MB`,
            `Server state: ${this.serverState}`,
        ];
        if (this.serverState === ServerState.STARTED) {
            report.push(
                'Server Usage:',
                `CPU: ${this.server?.cpuTotal}% (Avg since start)`,
                `RAM: ${this.server?.mem} MB`,
            );
        }

        return report.join('\n');
    }

}
