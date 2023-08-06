declare module '@senfo/process-list' {

    interface SnapshotItem {
        name: string;
        pid: number;
        ppid: number;
        path: string;
        threads: number;
        owner: string;
        priority: number;
        cmdline: string;
        starttime: Date;
        vmem: string;
        pmem: string;
        cpu: number;
        utime: string;
        stime: string;
    }

    type SnapshotArg = keyof SnapshotItem;

    /**
    * get process list
    */
    function snapshot(...args: SnapshotArg[]): Promise<SnapshotItem[]>;

}
