import { Processes } from '../services/processes';
import { LogLevel } from '../util/logger';
import { ServerState, SystemReport } from '../types/monitor';
import { IService } from '../types/service';
import { injectable, singleton } from 'tsyringe';
import { LoggerFactory } from './loggerfactory';
import { ServerDetector } from './server-detector';
import { Monitor } from './monitor';

@singleton()
@injectable()
export class SystemReporter extends IService {

    private prevReport: SystemReport | null = null;
    private prevReportTS: number;

    public constructor(
        loggerFactory: LoggerFactory,
        private processes: Processes,
        private monitor: Monitor,
        private serverDetector: ServerDetector,
    ) {
        super(loggerFactory.createLogger('SystemReport'));
    }

    public async getSystemReport(): Promise<SystemReport | null> {
        try {

            let prevReport = null;
            if (this.prevReport && (new Date().valueOf() - this.prevReportTS) < (15 * 60 * 1000)) {
                prevReport = this.prevReport;
            }

            const system = this.processes.getSystemUsage();
            let busy = 0;
            let idle = 0;

            const eachCPU = system.cpu.map((cpu) => {
                const t = cpu.times;
                const cpuBusy = t.user + t.nice + t.sys + t.irq;

                idle += t.idle;
                busy += cpuBusy;

                return Math.round((cpuBusy / (t.idle + cpuBusy)) * 100);
            });

            let interval = busy + idle;
            let used = busy;
            if (prevReport?.value?.system?.cpuSpent && prevReport?.value?.system?.uptime) {
                interval -= prevReport.value.system.uptime;
                used -= prevReport.value.system.cpuSpent;
            }

            const report = new SystemReport();
            report.system = {
                cpuTotal: Math.round((used / interval) * 100),
                cpuSpent: busy,
                uptime: busy + idle,
                cpuEach: eachCPU,
                mem: Math.floor((system.memTotal - system.memFree) / 1024 / 1024),
                memTotal: Math.floor(system.memTotal / 1024 / 1024),
            };

            report.serverState = this.monitor.serverState;

            const processCpu = process.cpuUsage();
            const processUp = process.uptime();

            let processInterval = processUp;
            let processUsed = (processCpu.system + processCpu.user) / 1000000;
            if (prevReport?.value?.manager?.cpuSpent && prevReport?.value?.manager?.uptime) {
                processInterval -= prevReport.value.manager.uptime;
                processUsed -= prevReport.value.manager.cpuSpent;
            }

            report.manager = {
                cpuTotal: Math.round((processUsed / processInterval) * 100),
                cpuSpent: processCpu.system + processCpu.user,
                uptime: processUp,
                mem: Math.floor(process.memoryUsage().heapTotal / 1024 / 1024),
            };

            if (this.monitor.serverState === ServerState.STARTED) {
                const processes = await this.serverDetector.getDayZProcesses();
                if (processes?.length) {
                    report.server = {
                        cpuTotal: this.processes.getProcessCPUUsage(processes[0]),
                        cpuSpent: this.processes.getProcessCPUSpent(processes[0]),
                        uptime: this.processes.getProcessUptime(processes[0]),
                        mem: Math.floor(Number(processes[0].PrivatePageCount) / 1024 / 1024),
                    };
                }
            }

            this.prevReport = report;
            this.prevReportTS = new Date().valueOf();

            return report;

        } catch (e) {
            this.log.log(LogLevel.ERROR, 'Error building system report', e);
            return null;
        }
    }

}
